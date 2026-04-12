import { useEffect, useState } from "react";
import type { ReceivedFile } from "../types";

interface Props {
  /** Local file object (Origin has this) */
  file?: File | null;
  /** File received via WebSocket (Target / Intruder) */
  receivedFile?: ReceivedFile | null;
  label: string;
}

/** Renders a preview of the file — images shown inline, text shown as code, others show metadata. */
export function FilePreview({ file, receivedFile, label }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<number>(0);
  const [fileType, setFileType] = useState<string>("");

  useEffect(() => {
    // Reset
    setPreview(null);
    setTextContent(null);

    // ── Source: local File object (Origin) ──
    if (file) {
      setFileName(file.name);
      setFileSize(file.size);
      setFileType(file.type || guessType(file.name));

      if (file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
      }

      if (isTextFile(file.type, file.name)) {
        const reader = new FileReader();
        reader.onload = () => setTextContent((reader.result as string).slice(0, 4000));
        reader.readAsText(file);
        return;
      }
      return;
    }

    // ── Source: WebSocket received data (Target / Intruder) ──
    if (receivedFile) {
      setFileName(receivedFile.name);
      const bytes = base64ToBytes(receivedFile.data);
      setFileSize(bytes.length);

      const type = guessType(receivedFile.name);
      setFileType(type);

      if (type.startsWith("image/")) {
        setPreview(`data:${type};base64,${receivedFile.data}`);
        return;
      }

      if (isTextFile(type, receivedFile.name)) {
        const decoder = new TextDecoder();
        setTextContent(decoder.decode(bytes).slice(0, 4000));
        return;
      }
      return;
    }
  }, [file, receivedFile]);

  if (!file && !receivedFile) return null;

  return (
    <div className="file-preview">
      <div className="file-preview__meta">
        <span className="file-preview__label">{label}</span>
        <span className="file-preview__name">{fileName}</span>
        <span className="file-preview__size">{formatSize(fileSize)}</span>
        <span className="file-preview__type">{fileType || "unknown type"}</span>
      </div>

      {preview && (
        <div className="file-preview__image-wrap">
          <img src={preview} alt={fileName} className="file-preview__image" />
        </div>
      )}

      {textContent && (
        <pre className="file-preview__text">{textContent}</pre>
      )}

      {!preview && !textContent && (
        <div className="file-preview__binary">
          <p>Binary file — preview not available</p>
        </div>
      )}
    </div>
  );
}

// ── Helpers ──

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function guessType(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
    svg: "image/svg+xml", webp: "image/webp", bmp: "image/bmp",
    txt: "text/plain", md: "text/markdown", csv: "text/csv",
    json: "application/json", xml: "text/xml", html: "text/html", css: "text/css",
    js: "text/javascript", ts: "text/typescript", py: "text/x-python",
    rs: "text/x-rust", go: "text/x-go", java: "text/x-java",
    c: "text/x-c", cpp: "text/x-c++", h: "text/x-c",
    sh: "text/x-shellscript", yaml: "text/yaml", yml: "text/yaml",
    toml: "text/toml", ini: "text/plain", log: "text/plain",
    pdf: "application/pdf",
  };
  return map[ext] ?? "";
}

function isTextFile(type: string, name: string): boolean {
  if (type.startsWith("text/")) return true;
  if (type === "application/json") return true;
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return [
    "json", "md", "csv", "xml", "yaml", "yml", "toml", "ini", "cfg", "log",
    "ts", "tsx", "js", "jsx", "py", "rs", "go", "java", "c", "cpp", "h",
    "html", "css", "sh", "bat",
  ].includes(ext);
}
