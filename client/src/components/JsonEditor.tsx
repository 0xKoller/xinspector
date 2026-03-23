import { useState, useEffect } from "react";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-json";
import "prismjs/themes/prism.css";

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
}

const JsonEditor = ({
  value,
  onChange,
  error: externalError,
  placeholder,
}: JsonEditorProps) => {
  const [editorContent, setEditorContent] = useState(value || "");
  const [internalError, setInternalError] = useState<string | undefined>(
    undefined,
  );

  useEffect(() => {
    setEditorContent(value || "");
  }, [value]);

  const handleEditorChange = (newContent: string) => {
    setEditorContent(newContent);
    setInternalError(undefined);
    onChange(newContent);
  };

  const displayError = internalError || externalError;

  return (
    <div className="relative">
      <div
        className={`border rounded-md ${
          displayError ? "border-destructive" : "border-border"
        }`}
      >
        <Editor
          value={editorContent}
          onValueChange={handleEditorChange}
          highlight={(code) =>
            Prism.highlight(code, Prism.languages.json, "json")
          }
          padding={10}
          placeholder={placeholder}
          style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: 14,
            backgroundColor: "transparent",
            minHeight: "100px",
          }}
          className="w-full"
        />
      </div>
      {displayError && (
        <p className="text-sm text-destructive mt-1">{displayError}</p>
      )}
    </div>
  );
};

export default JsonEditor;
