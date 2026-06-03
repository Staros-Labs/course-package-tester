import fs from "node:fs";
import path from "node:path";
import { DOMParser } from "@xmldom/xmldom";

function textAttribute(node, name) {
  if (!node || !node.getAttribute) return "";
  return node.getAttribute(name) || "";
}

function nodeText(node) {
  return node && node.textContent ? node.textContent.trim() : "";
}

function firstElementByTag(document, tagName) {
  const nodes = document.getElementsByTagName(tagName);
  return nodes && nodes.length ? nodes.item(0) : null;
}

function normalizeManifestPath(value) {
  const normalized = String(value || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("\0")) return "";
  const parts = normalized.split("/");
  if (parts.some((part) => part === "..")) return "";
  return normalized;
}

export function parseManifestXml(xml) {
  const document = new DOMParser({
    errorHandler: {
      warning() {},
      error(message) {
        throw new Error(message);
      },
      fatalError(message) {
        throw new Error(message);
      },
    },
  }).parseFromString(xml, "application/xml");

  const parserError = firstElementByTag(document, "parsererror");
  if (parserError) {
    throw new Error(nodeText(parserError) || "Manifest XML parse failed");
  }

  const title = nodeText(firstElementByTag(document, "title"));
  const organizations = firstElementByTag(document, "organizations");
  const defaultOrganizationId = textAttribute(organizations, "default");
  let launchResourceId = "";

  if (defaultOrganizationId) {
    const organizationNodes = Array.from(document.getElementsByTagName("organization"));
    const organization = organizationNodes.find((node) => textAttribute(node, "identifier") === defaultOrganizationId);
    const item = organization ? firstElementByTag(organization, "item") : null;
    launchResourceId = textAttribute(item, "identifierref");
  }

  if (!launchResourceId) {
    const item = firstElementByTag(document, "item");
    launchResourceId = textAttribute(item, "identifierref");
  }

  const resources = Array.from(document.getElementsByTagName("resource"));
  const launchResource = launchResourceId
    ? resources.find((node) => textAttribute(node, "identifier") === launchResourceId)
    : resources.find((node) => textAttribute(node, "href"));
  const href = normalizeManifestPath(textAttribute(launchResource, "href"));

  return {
    title,
    launchPath: href,
    resourceId: launchResource ? textAttribute(launchResource, "identifier") : "",
    parsed: true,
  };
}

export function readManifest(manifestPath) {
  try {
    const xml = fs.readFileSync(manifestPath, "utf8");
    return parseManifestXml(xml);
  } catch (error) {
    return {
      title: "",
      launchPath: "",
      resourceId: "",
      parsed: false,
      error: error.message,
    };
  }
}

export function detectLaunchPath(courseDir) {
  const manifestPath = path.join(courseDir, "imsmanifest.xml");
  if (fs.existsSync(manifestPath)) {
    const manifest = readManifest(manifestPath);
    if (manifest.launchPath && fs.existsSync(path.join(courseDir, manifest.launchPath))) {
      return {
        launchPath: manifest.launchPath,
        manifest,
        type: "scorm",
      };
    }
    return {
      launchPath: fallbackLaunchPath(courseDir),
      manifest,
      type: "scorm",
    };
  }

  return {
    launchPath: fallbackLaunchPath(courseDir),
    manifest: null,
    type: "web",
  };
}

export function fallbackLaunchPath(courseDir) {
  const candidates = ["index.html", "scorm-src/index.html"];
  return candidates.find((candidate) => fs.existsSync(path.join(courseDir, candidate))) || "";
}

export function findLaunchCandidates(courseDir) {
  const candidates = [];
  const manifestPath = path.join(courseDir, "imsmanifest.xml");
  if (fs.existsSync(manifestPath)) {
    const manifest = readManifest(manifestPath);
    if (manifest.launchPath) {
      candidates.push({
        launchPath: manifest.launchPath,
        source: "manifest",
        type: "scorm",
        manifest,
      });
    }
  }

  const walk = (dir, prefix = "") => {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const rel = prefix ? `${prefix}/${name}` : name;
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        if (name === "node_modules" || name === "__MACOSX") continue;
        walk(full, rel);
      } else if (name.toLowerCase() === "index.html") {
        candidates.push({
          launchPath: rel,
          source: "index",
          type: fs.existsSync(manifestPath) ? "scorm" : "web",
          manifest: fs.existsSync(manifestPath) ? readManifest(manifestPath) : null,
        });
      }
    }
  };

  walk(courseDir);

  const seen = new Set();
  return candidates.filter((candidate) => {
    if (!candidate.launchPath || seen.has(candidate.launchPath)) return false;
    seen.add(candidate.launchPath);
    return true;
  });
}
