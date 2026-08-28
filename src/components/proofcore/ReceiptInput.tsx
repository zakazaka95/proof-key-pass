import { FileJson, RotateCcw, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { DEMO_RECEIPT_JSON } from "@/lib/technocore/demo";

interface ReceiptInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
}

export function ReceiptInput({ value, onChange, onClear }: ReceiptInputProps) {
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const readFile = async (file: File | undefined) => {
    setFileError(null);
    if (!file) return;
    if (!/\.json$/i.test(file.name) && file.type !== "application/json") {
      setFileError("Please provide a .json receipt file.");
      return;
    }
    if (file.size > 512 * 1024) {
      setFileError("That file is larger than 512 KB — receipts are small.");
      return;
    }
    onChange(await file.text());
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void readFile(event.dataTransfer.files[0]);
        }}
        className={cn(
          "flex flex-col items-center gap-3 border border-dashed border-border-strong bg-surface px-4 py-8 text-center transition-colors",
          dragging && "border-primary",
        )}
      >
        <Upload className="size-5 text-primary" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">
          Drag & drop a Technocore receipt JSON file, or
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="border border-primary px-4 py-2 font-mono text-xs uppercase tracking-[0.14em] text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
        >
          Choose file
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          aria-label="Receipt JSON file"
          onChange={(event) => void readFile(event.target.files?.[0])}
        />
        <p className="label-caps">Receipt data stays in this browser</p>
      </div>

      {fileError ? (
        <p role="alert" className="text-sm text-destructive">
          {fileError}
        </p>
      ) : null}

      <div className="space-y-2">
        <label htmlFor="receipt-json" className="label-caps block">
          Or paste receipt JSON
        </label>
        <textarea
          id="receipt-json"
          value={value}
          spellCheck={false}
          onChange={(event) => onChange(event.target.value)}
          rows={10}
          placeholder='{ "type": "technocore-signed-message-receipt", ... }'
          className="w-full resize-y border border-border bg-surface p-3 font-mono text-xs leading-relaxed text-foreground placeholder:text-muted-foreground/70"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange(DEMO_RECEIPT_JSON)}
          className="inline-flex items-center gap-2 border border-border px-3 py-2 font-mono text-xs uppercase tracking-[0.14em] text-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <FileJson className="size-3.5" /> Load demo receipt
        </button>
        <button
          type="button"
          onClick={() => {
            setFileError(null);
            onClear();
          }}
          className="inline-flex items-center gap-2 border border-border px-3 py-2 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
        >
          <RotateCcw className="size-3.5" /> Clear
        </button>
      </div>
    </div>
  );
}
