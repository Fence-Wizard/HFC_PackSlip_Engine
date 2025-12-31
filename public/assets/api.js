import { toast } from "./ui.js";

export async function apiGet(url) {
  return apiFetch(url, { method: "GET" });
}

export async function apiPost(url, body, opts = {}) {
  return apiFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    body: JSON.stringify(body ?? {}),
  });
}

export async function uploadFile(url, file, onProgress, extraFields = {}) {
  const form = new FormData();
  form.append("file", file);
  
  // Add any extra fields (like vendorId)
  for (const [key, value] of Object.entries(extraFields)) {
    if (value !== undefined && value !== null && value !== "") {
      form.append(key, value);
    }
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.responseType = "json";

    xhr.upload.onprogress = (evt) => {
      if (!evt.lengthComputable) return;
      const pct = Math.round((evt.loaded / evt.total) * 100);
      onProgress?.(pct);
    };

    xhr.onload = () => {
      const ok = xhr.status >= 200 && xhr.status < 300;
      if (!ok) {
        const msg = (xhr.response && (xhr.response.error || xhr.response.message)) || `Upload failed (${xhr.status})`;
        toast(msg, "error");
        return reject(new Error(msg));
      }
      resolve(xhr.response);
    };

    xhr.onerror = () => {
      toast("Network error during upload.", "error");
      reject(new Error("Network error"));
    };

    xhr.send(form);
  });
}

async function apiFetch(url, options) {
  try {
    const res = await fetch(url, options);
    const ct = res.headers.get("content-type") || "";
    const data = ct.includes("application/json") ? await res.json().catch(() => null) : await res.text().catch(() => null);

    if (!res.ok) {
      const msg =
        (data && (data.error || data.message)) ||
        (typeof data === "string" && data) ||
        `Request failed (${res.status})`;
      toast(msg, "error");
      throw new Error(msg);
    }
    return data;
  } catch (err) {
    toast(err?.message || "Request failed.", "error");
    throw err;
  }
}

