import { exec } from "node:child_process";

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
  return Array.from(new Set(names));
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
      "if (Get-Command Set-PrintConfiguration -ErrorAction SilentlyContinue) {",
      "  Set-PrintConfiguration -PrinterName $printer -Color $true -ErrorAction SilentlyContinue;",
      "}",
      "$doc.PrintController = New-Object System.Drawing.Printing.StandardPrintController;",
      "$doc.OriginAtMargins = $false;",
      "$doc.DefaultPageSettings.Landscape = $false;",
      "$doc.DefaultPageSettings.Color = $true;",
      "$doc.PrinterSettings.DefaultPageSettings.Color = $true;",
      "$doc.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0, 0, 0, 0);",
      "$paper = New-Object System.Drawing.Printing.PaperSize('PostcardBorderless', 394, 583);",
      "$doc.DefaultPageSettings.PaperSize = $paper;",
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
      resolve(parsePrinterList(stdout, { isWindows: process.platform === "win32" }));
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
