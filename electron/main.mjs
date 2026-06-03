import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { app, BrowserWindow, Menu, dialog } from "electron";

let mainWindow = null;
let stopTesterServer = null;

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return {};
  }
}

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

function isDirectory(value) {
  try {
    return fs.statSync(value).isDirectory();
  } catch {
    return false;
  }
}

function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const port = address && typeof address === "object" ? address.port : 4310;
      probe.close(() => resolve(port));
    });
  });
}

async function chooseCourseRoot(configPath) {
  const config = readJson(configPath);
  const envRoot = process.env.COURSE_TESTER_ROOT || process.env.SCORM_TESTER_ROOT || "";
  const exeDir = path.dirname(app.getPath("exe"));
  const bundledCoursesDir = path.join(exeDir, "courses");

  if (envRoot && isDirectory(path.resolve(envRoot))) return path.resolve(envRoot);
  if (isDirectory(bundledCoursesDir)) return bundledCoursesDir;
  if (config.lastCourseRoot && isDirectory(config.lastCourseRoot)) return config.lastCourseRoot;

  const result = await dialog.showOpenDialog({
    title: "Select Course Folder",
    message: "Select the folder that contains the unpacked course folders.",
    properties: ["openDirectory"],
  });

  if (result.canceled || result.filePaths.length === 0) return null;

  const selected = result.filePaths[0];
  writeJson(configPath, { ...config, lastCourseRoot: selected });
  return selected;
}

function setAppMenu(configPath) {
  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "Choose Course Folder...",
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              title: "Select Course Folder",
              properties: ["openDirectory"],
            });
            if (result.canceled || result.filePaths.length === 0) return;

            writeJson(configPath, {
              ...readJson(configPath),
              lastCourseRoot: result.filePaths[0],
            });

            app.relaunch();
            app.exit(0);
          },
        },
        { type: "separator" },
        { role: "reload" },
        { role: "quit" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "toggleDevTools" },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function createWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1180,
    minHeight: 760,
    title: "Course Package Tester",
    backgroundColor: "#f3f5f8",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  await mainWindow.loadURL(url);
}

async function main() {
  const configPath = path.join(app.getPath("userData"), "config.json");
  const courseRoot = await chooseCourseRoot(configPath);

  if (!courseRoot) {
    app.quit();
    return;
  }

  setAppMenu(configPath);

  process.env.COURSE_TESTER_ROOT = courseRoot;
  process.env.COURSE_TESTER_USER_DATA = app.getPath("userData");
  process.env.PORT = String(await findAvailablePort());

  const serverModule = await import("../server.mjs");
  stopTesterServer = serverModule.stopTesterServer;
  const details = await serverModule.startTesterServer();
  console.log(`Course Package Tester desktop running at ${details.url}`);
  console.log(`Library root: ${details.contentRoot}`);

  await createWindow(details.url);
}

app.whenReady().then(() => {
  main().catch((error) => {
    dialog.showErrorBox("Course Package Tester failed to start", error.message);
    app.quit();
  });
});

app.on("window-all-closed", () => {
  app.quit();
});

app.on("before-quit", async (event) => {
  if (!stopTesterServer) return;

  event.preventDefault();
  const stop = stopTesterServer;
  stopTesterServer = null;
  await stop().catch(() => {});
  app.exit(0);
});
