import { exec } from "node:child_process";

function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, { maxBuffer: 1024 * 1024 * 4 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr?.trim() || error.message));
        return;
      }
      resolve(stdout || "");
    });
  });
}

function uniqueSortedStrings(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function parsePrinterList(output, { isWindows = false } = {}) {
  if (!output) {
    return [];
  }
  const names = output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (isWindows) {
        return line;
      }
      if (line.startsWith("printer ")) {
        const parts = line.split(/\s+/);
        return parts[1] ?? "";
      }
      return line.split(/\s+/)[0] ?? "";
    })
    .filter(Boolean);
  return uniqueSortedStrings(names);
}

function getDefaultPrintCommand() {
  if (process.platform === "win32") {
    return [
      'powershell -NoProfile -WindowStyle Hidden -Command "',
      "$ErrorActionPreference = 'Stop';",
      "Add-Type -AssemblyName System.Drawing;",
      "$printer = '{printer}';",
      "$file = '{file}';",
      "$copies = [int]{copies};",
      "$img = [System.Drawing.Image]::FromFile($file);",
      "$doc = New-Object System.Drawing.Printing.PrintDocument;",
      "$doc.PrinterSettings.PrinterName = $printer;",
      "if (-not $doc.PrinterSettings.IsValid) {",
      "  $available = (Get-Printer | Select-Object -ExpandProperty Name) -join ', ';",
      "  throw (\"Printer \" + $printer + \" is not valid. Available: \" + $available);",
      "}",
      "$doc.PrintController = New-Object System.Drawing.Printing.StandardPrintController;",
      "$doc.OriginAtMargins = $false;",
      "$doc.DefaultPageSettings.Landscape = $false;",
      "$doc.DefaultPageSettings.Color = $true;",
      "$doc.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0, 0, 0, 0);",
      "$res = $doc.PrinterSettings.PrinterResolutions | Sort-Object X,Y -Descending | Select-Object -First 1;",
      "if ($res) { $doc.DefaultPageSettings.PrinterResolution = $res; }",
      "$doc.add_PrintPage({ param($sender, $e)",
      "  $printImg = $img;",
      "  if ($printImg.Width -gt $printImg.Height) {",
      "    $printImg.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipNone);",
      "  }",
      "  $e.Graphics.PageUnit = [System.Drawing.GraphicsUnit]::Pixel;",
      "  $e.PageSettings.Color = $true;",
      "  $area = $e.PageSettings.PrintableArea;",
      "  $pageWidth = $area.Width * $e.Graphics.DpiX / 100;",
      "  $pageHeight = $area.Height * $e.Graphics.DpiY / 100;",
      "  $originX = $area.X * $e.Graphics.DpiX / 100;",
      "  $originY = $area.Y * $e.Graphics.DpiY / 100;",
      "  $ratio = [Math]::Max($pageWidth / $printImg.Width, $pageHeight / $printImg.Height);",
      "  $w = [int]($printImg.Width * $ratio);",
      "  $h = [int]($printImg.Height * $ratio);",
      "  $x = [int]($originX + ($pageWidth - $w) / 2);",
      "  $y = [int]($originY + ($pageHeight - $h) / 2);",
      "  $e.Graphics.DrawImage($printImg, $x, $y, $w, $h);",
      "  $e.HasMorePages = $false;",
      "});",
      "for ($i = 0; $i -lt $copies; $i++) { $doc.Print(); }",
      "$img.Dispose();",
      '"',
    ].join(" ");
  }
  return 'lp -d "{printer}" -n {copies}{options} "{file}"';
}

function getDefaultPrinterListCommand() {
  if (process.platform === "win32") {
    return 'powershell -NoProfile -Command "Get-Printer | Select-Object -ExpandProperty Name"';
  }
  return "lpstat -a";
}

function getDefaultPrinterDetailsCommand() {
  if (process.platform === "win32") {
    return 'powershell -NoProfile -Command "Get-Printer | Select-Object Name,ShareName,PortName,DriverName,Type,ComputerName,PrinterStatus,Location,Comment | ConvertTo-Json -Depth 4"';
  }
  return "lpstat -p -d -l -v";
}

function getDefaultPrinterOptionsCommand(printerName) {
  if (process.platform === "win32") {
    return `powershell -NoProfile -Command "Get-PrintConfiguration -PrinterName '${printerName.replace(/'/g, "''")}' | ConvertTo-Json -Depth 4"`;
  }
  return `lpoptions -p '${printerName.replace(/'/g, "'\\''")}' -l`;
}

function classifyPrinterFromUri(uri) {
  if (!uri) {
    return "unknown";
  }
  const trimmed = String(uri).trim();
  if (trimmed.startsWith("usb://") || trimmed.startsWith("parallel:") || trimmed.startsWith("serial:")) {
    return "local";
  }
  const networkPrefixes = ["ipp://", "ipps://", "socket://", "lpd://", "http://", "https://", "dnssd://"];
  if (networkPrefixes.some((prefix) => trimmed.startsWith(prefix))) {
    return "network";
  }
  return "unknown";
}

function parseLinuxPrinterDetails(output, namesFromList) {
  const lines = (output || "").split("\n");
  const printers = new Map();
  let defaultPrinter = "";

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }
    if (line.startsWith("system default destination:")) {
      defaultPrinter = line.replace("system default destination:", "").trim();
      continue;
    }

    const printerStatus = line.match(/^printer\s+(\S+)\s+(.*)$/i);
    if (printerStatus) {
      const [, name, statusText] = printerStatus;
      const existing = printers.get(name) || { name, options: {}, status: "" };
      existing.status = statusText.trim();
      printers.set(name, existing);
      continue;
    }

    const device = line.match(/^device for\s+(.+?):\s+(.+)$/i);
    if (device) {
      const [, name, uri] = device;
      const existing = printers.get(name) || { name, options: {}, status: "" };
      existing.uri = uri.trim();
      existing.connection = classifyPrinterFromUri(existing.uri);
      printers.set(name, existing);
      continue;
    }

    const description = line.match(/^Description:\s+(.+)$/i);
    if (description) {
      const last = Array.from(printers.values()).at(-1);
      if (last) {
        last.description = description[1].trim();
      }
      continue;
    }

    const location = line.match(/^Location:\s+(.+)$/i);
    if (location) {
      const last = Array.from(printers.values()).at(-1);
      if (last) {
        last.location = location[1].trim();
      }
      continue;
    }

    const makeModel = line.match(/^Interface:\s+(.+)$/i);
    if (makeModel) {
      const last = Array.from(printers.values()).at(-1);
      if (last) {
        last.interface = makeModel[1].trim();
      }
    }
  }

  uniqueSortedStrings(namesFromList).forEach((name) => {
    if (!printers.has(name)) {
      printers.set(name, { name, options: {}, status: "" });
    }
  });

  return Array.from(printers.values())
    .map((printer) => ({
      name: printer.name,
      isDefault: printer.name === defaultPrinter,
      connection: printer.connection || "unknown",
      uri: printer.uri || "",
      status: printer.status || "",
      location: printer.location || "",
      description: printer.description || "",
      interface: printer.interface || "",
      options: printer.options || {},
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function parseLinuxPrinterOptions(output) {
  const options = {};
  (output || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const [key, rest] = line.split(":", 2);
      if (!key || !rest) {
        return;
      }
      const values = rest
        .trim()
        .split(/\s+/)
        .map((token) => token.replace(/^\*?/, ""))
        .filter(Boolean);
      options[key.trim()] = uniqueSortedStrings(values);
    });
  return options;
}

function parseWindowsPrinterDetails(output, namesFromList) {
  let parsed = [];
  try {
    const json = JSON.parse(output || "[]");
    parsed = Array.isArray(json) ? json : [json];
  } catch (error) {
    parsed = [];
  }

  const byName = new Map();
  parsed.forEach((entry) => {
    const name = String(entry?.Name || "").trim();
    if (!name) {
      return;
    }
    byName.set(name, {
      name,
      isDefault: false,
      connection: String(entry?.PortName || "").includes("IP_") ? "network" : "local",
      uri: String(entry?.PortName || ""),
      status: String(entry?.PrinterStatus || ""),
      location: String(entry?.Location || ""),
      description: String(entry?.Comment || ""),
      interface: String(entry?.DriverName || ""),
      options: {},
    });
  });

  uniqueSortedStrings(namesFromList).forEach((name) => {
    if (!byName.has(name)) {
      byName.set(name, {
        name,
        isDefault: false,
        connection: "unknown",
        uri: "",
        status: "",
        location: "",
        description: "",
        interface: "",
        options: {},
      });
    }
  });

  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
}

async function listPrinters(listCommand) {
  const command = listCommand || getDefaultPrinterListCommand();
  try {
    const stdout = await runCommand(command);
    return parsePrinterList(stdout, { isWindows: process.platform === "win32" });
  } catch (error) {
    return [];
  }
}

async function listPrinterDetails() {
  const [names, detailsOutput] = await Promise.all([
    listPrinters(getPrinterListCommand()),
    runCommand(getPrinterDetailsCommand()).catch(() => ""),
  ]);

  const printers = process.platform === "win32"
    ? parseWindowsPrinterDetails(detailsOutput, names)
    : parseLinuxPrinterDetails(detailsOutput, names);

  await Promise.all(
    printers.map(async (printer) => {
      try {
        const optionsRaw = await runCommand(getPrinterOptionsCommand(printer.name));
        if (process.platform === "win32") {
          let parsed = {};
          try {
            parsed = JSON.parse(optionsRaw || "{}");
          } catch {
            parsed = {};
          }
          printer.options = Object.fromEntries(
            Object.entries(parsed || {}).map(([key, value]) => [
              key,
              Array.isArray(value) ? value.map((item) => String(item)) : [String(value)],
            ])
          );
        } else {
          printer.options = parseLinuxPrinterOptions(optionsRaw);
        }
      } catch (error) {
        printer.options = printer.options || {};
      }
    })
  );

  return printers;
}

function sanitizeLpOptions(printOptions = {}) {
  return Object.entries(printOptions)
    .filter(([key, value]) => typeof key === "string" && key.trim() && value !== undefined && value !== null)
    .map(([key, value]) => {
      const safeKey = key.replace(/[^a-zA-Z0-9._-]/g, "");
      const safeValue = String(value).replace(/[^a-zA-Z0-9._:-]/g, "");
      if (!safeKey || !safeValue) {
        return "";
      }
      return ` -o ${safeKey}=${safeValue}`;
    })
    .join("");
}

function runPrintCommand(command, printerName, filePath, copies = 1, printOptions = {}) {
  const optionsToken = process.platform === "win32" ? "" : sanitizeLpOptions(printOptions);
  const cmd = command
    .replace("{printer}", printerName)
    .replace("{file}", filePath)
    .replace("{copies}", String(copies))
    .replace("{options}", optionsToken);
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr?.trim() || stdout?.trim() || error.message));
        return;
      }
      resolve();
    });
  });
}

export function getPrintCommand() {
  return process.env.PRINTER_COMMAND || getDefaultPrintCommand();
}

export function getPrinterListCommand() {
  return process.env.PRINTER_LIST_COMMAND || getDefaultPrinterListCommand();
}

export function getPrinterDetailsCommand() {
  return process.env.PRINTER_DETAILS_COMMAND || getDefaultPrinterDetailsCommand();
}

export function getPrinterOptionsCommand(printerName) {
  if (process.env.PRINTER_OPTIONS_COMMAND) {
    return process.env.PRINTER_OPTIONS_COMMAND.replace("{printer}", printerName);
  }
  return getDefaultPrinterOptionsCommand(printerName);
}

export async function fetchPrinters() {
  return listPrinterDetails();
}

export async function sendToPrinter(printerName, filePath, copies = 1, printOptions = {}) {
  const printers = await fetchPrinters();
  const match = printers.find((printer) => printer.name === printerName);
  if (!match) {
    const available = printers.map((printer) => printer.name).join(", ") || "none";
    throw new Error(`Printer '${printerName}' not found. Available printers: ${available}`);
  }
  const command = getPrintCommand();
  return runPrintCommand(command, printerName, filePath, copies, printOptions);
}
