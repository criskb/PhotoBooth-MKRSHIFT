export function createPrinterController({
  settingsPrinterInput,
  settingsPrinterDetails,
  toPrinterEntry,
}) {
  let knownPrinters = [];

  function findPrinterByName(name) {
    return knownPrinters.find((printer) => printer.name === name) || null;
  }

  function formatPrinterDetails(printer) {
    if (!printer) {
      return "No printer selected.";
    }
    const lines = [
      `Connection: ${printer.connection || "unknown"}`,
      `URI/Port: ${printer.uri || "n/a"}`,
      `Location: ${printer.location || "n/a"}`,
      `Driver/Interface: ${printer.interface || "n/a"}`,
    ];
    const optionEntries = Object.entries(printer.options || {});
    if (optionEntries.length) {
      lines.push("Options:");
      optionEntries.slice(0, 8).forEach(([key, values]) => {
        const rendered = Array.isArray(values) ? values.join(", ") : String(values || "");
        lines.push(`• ${key}: ${rendered}`);
      });
    } else {
      lines.push("Options: none reported");
    }
    return lines.join("\n");
  }

  function updatePrinterDetails(selectedName) {
    if (!settingsPrinterDetails) {
      return;
    }
    const selectedPrinter = findPrinterByName(selectedName);
    settingsPrinterDetails.textContent = formatPrinterDetails(selectedPrinter);
  }

  function renderPrinterOptions(printers, selectedName) {
    if (!settingsPrinterInput) {
      return;
    }
    const options = [];
    const seen = new Set();
    const sorted = [...printers].sort((a, b) => a.name.localeCompare(b.name));
    sorted.forEach((printer) => {
      if (!printer?.name || seen.has(printer.name)) {
        return;
      }
      seen.add(printer.name);
      const tags = [];
      if (printer.isDefault) {
        tags.push("default");
      }
      if (printer.connection && printer.connection !== "unknown") {
        tags.push(printer.connection);
      }
      const suffix = tags.length ? ` (${tags.join(", ")})` : "";
      options.push({ name: printer.name, label: `${printer.name}${suffix}` });
    });
    if (selectedName && !seen.has(selectedName)) {
      options.unshift({ name: selectedName, label: `${selectedName} (saved)` });
    }
    settingsPrinterInput.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = options.length ? "Select a printer" : "No printers detected";
    settingsPrinterInput.appendChild(placeholder);
    options.forEach((entry) => {
      const option = document.createElement("option");
      option.value = entry.name;
      option.textContent = entry.label;
      settingsPrinterInput.appendChild(option);
    });
    settingsPrinterInput.value = selectedName || "";
    updatePrinterDetails(settingsPrinterInput.value || selectedName || "");
  }

  async function loadPrinters(selectedName, endpoint = "/api/printers") {
    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error("Printer list unavailable");
      }
      const data = await response.json();
      const detailed = Array.isArray(data.printerDetails) ? data.printerDetails : data.printers;
      knownPrinters = (Array.isArray(detailed) ? detailed : [])
        .map((entry) => toPrinterEntry(entry))
        .filter(Boolean);
    } catch (error) {
      knownPrinters = [];
    }
    renderPrinterOptions(knownPrinters, selectedName);
  }

  return {
    updatePrinterDetails,
    loadPrinters,
  };
}
