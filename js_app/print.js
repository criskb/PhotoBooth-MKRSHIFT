import { exec } from "node:child_process";

function parsePrinterList(output) {
  if (!output) {
    return [];
  }
  const names = output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (line.startsWith("printer ")) {
        const parts = line.split(/\s+/);
        return parts[1] ?? "";
      }
      return line.split(/\s+/)[0] ?? "";
    })
    .filter(Boolean);
  return Array.from(new Set(names));
}

function getDefaultPrintCommand() {
  if (process.platform === "win32") {
    return [
      'powershell -NoProfile -Command "',
      "$ErrorActionPreference = 'Stop';",
      "Add-Type -AssemblyName System.Drawing;",
      "$printer = '{printer}';",
      "$file = '{file}';",
      "$copies = [int]{copies};",
      "$img = [System.Drawing.Image]::FromFile($file);",
      "$doc = New-Object System.Drawing.Printing.PrintDocument;",
      "if ($printer) { $doc.PrinterSettings.PrinterName = $printer; }",
      "$doc.PrintPage += { param($sender, $e)",
      "  $bounds = $e.MarginBounds;",
      "  $ratio = [Math]::Min($bounds.Width / $img.Width, $bounds.Height / $img.Height);",
      "  $w = [int]($img.Width * $ratio);",
      "  $h = [int]($img.Height * $ratio);",
      "  $x = $bounds.Left + [int](($bounds.Width - $w) / 2);",
      "  $y = $bounds.Top + [int](($bounds.Height - $h) / 2);",
      "  $e.Graphics.DrawImage($img, $x, $y, $w, $h);",
      "  $e.HasMorePages = $false;",
      "};",
      "for ($i = 0; $i -lt $copies; $i++) { $doc.Print(); }",
      "$img.Dispose();",
      '"'
    ].join(" ");
  }
  return 'lp -d "{printer}" -n {copies} "{file}"';
}

function getDefaultPrinterListCommand() {
  if (process.platform === "win32") {
    return 'powershell -NoProfile -Command "Get-Printer | Select-Object -ExpandProperty Name"';
  }
  return "lpstat -a";
}

function runPrintCommand(command, printerName, filePath, copies = 1) {
  const cmd = command
    .replace("{printer}", printerName)
    .replace("{file}", filePath)
    .replace("{copies}", String(copies));
  return new Promise((resolve, reject) => {
    exec(cmd, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function listPrinters(listCommand) {
  const command = listCommand || getDefaultPrinterListCommand();
  return new Promise((resolve) => {
    exec(command, (error, stdout) => {
      if (error) {
        resolve([]);
        return;
      }
      resolve(parsePrinterList(stdout));
    });
  });
}

export function getPrintCommand() {
  return process.env.PRINTER_COMMAND || getDefaultPrintCommand();
}

export function getPrinterListCommand() {
  return process.env.PRINTER_LIST_COMMAND || getDefaultPrinterListCommand();
}

export function fetchPrinters() {
  return listPrinters(getPrinterListCommand());
}

export function sendToPrinter(printerName, filePath, copies = 1) {
  const command = getPrintCommand();
  return runPrintCommand(command, printerName, filePath, copies);
}
