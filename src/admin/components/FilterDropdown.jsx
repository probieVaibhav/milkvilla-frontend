import { useEffect, useId, useRef, useState } from "react";

export default function FilterDropdown({ label, value, options, onChange }) {
  const id = useId();
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const selectedOption = options[selectedIndex];

  useEffect(() => {
    if (!open) return undefined;

    const closeOnOutsidePointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    optionRefs.current[activeIndex]?.focus({ preventScroll: true });
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [open]);

  const openMenu = () => {
    setActiveIndex(selectedIndex);
    setOpen(true);
  };

  const closeMenu = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };

  const selectOption = (option) => {
    onChange(option.value);
    closeMenu(true);
  };

  const handleTriggerKeyDown = (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      openMenu();
    }
  };

  const handleMenuKeyDown = (event) => {
    let nextIndex = activeIndex;
    if (event.key === "ArrowDown") nextIndex = (activeIndex + 1) % options.length;
    else if (event.key === "ArrowUp") nextIndex = (activeIndex - 1 + options.length) % options.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = options.length - 1;
    else if (event.key === "Escape") {
      event.preventDefault();
      closeMenu(true);
      return;
    } else if (event.key === "Tab") {
      closeMenu();
      return;
    } else {
      return;
    }

    event.preventDefault();
    setActiveIndex(nextIndex);
    optionRefs.current[nextIndex]?.focus({ preventScroll: true });
  };

  return (
    <div className={`filter-field custom-dropdown-field${open ? " is-open" : ""}`} ref={rootRef}>
      <span className="filter-field-label" id={`${id}-label`}>{label}</span>
      <button
        ref={triggerRef}
        className={`filter-dropdown-trigger${open ? " is-open" : ""}`}
        type="button"
        aria-labelledby={`${id}-label ${id}-value`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className="filter-dropdown-value" id={`${id}-value`}>{selectedOption.label}</span>
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
          <path d="m5 7.5 5 5 5-5" />
        </svg>
      </button>
      {open && (
        <div
          className="filter-dropdown-menu"
          id={`${id}-listbox`}
          role="listbox"
          aria-labelledby={`${id}-label`}
          onKeyDown={handleMenuKeyDown}
        >
          {options.map((option, index) => (
            <button
              key={option.value}
              ref={(element) => { optionRefs.current[index] = element; }}
              className={`filter-dropdown-option${option.value === value ? " is-selected" : ""}${index === activeIndex ? " is-active" : ""}`}
              type="button"
              role="option"
              aria-selected={option.value === value}
              tabIndex={-1}
              onFocus={() => setActiveIndex(index)}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => selectOption(option)}
            >
              <span>{option.label}</span>
              {option.value === value && (
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
                  <path d="m4 10 4 4 8-8" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
