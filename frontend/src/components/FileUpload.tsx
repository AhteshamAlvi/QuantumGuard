import { useRef, useState, type DragEvent } from "react";

interface Props {
  file: File | null;
  onUpload: (file: File) => void;
  disabled?: boolean;
}

export function FileUpload({ file, onUpload, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) onUpload(f);
  }

  function handleChange() {
    const f = inputRef.current?.files?.[0];
    if (f) onUpload(f);
  }

  return (
    <div
      className={`file-upload${dragOver ? " file-upload--drag" : ""}${file ? " file-upload--has-file" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {file ? (
        <div className="file-upload__info">
          <span className="file-upload__name">{file.name}</span>
          <span className="file-upload__size">{(file.size / 1024).toFixed(1)} KB</span>
        </div>
      ) : (
        <div className="file-upload__prompt">
          <p>Drag a file here or</p>
          <button
            className="file-upload__btn"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
          >
            Choose file
          </button>
        </div>
      )}
      <input ref={inputRef} type="file" hidden onChange={handleChange} disabled={disabled} />
    </div>
  );
}
