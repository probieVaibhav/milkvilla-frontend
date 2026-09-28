import { useEffect } from "react";

export default function useAutoDismiss(value, setValue, emptyValue = "") {
  useEffect(() => {
    if (!value) return undefined;
    const timeout = window.setTimeout(() => setValue(emptyValue), 5000);
    return () => window.clearTimeout(timeout);
  }, [value, setValue, emptyValue]);
}
