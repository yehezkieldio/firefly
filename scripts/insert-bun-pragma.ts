const filePath = "dist/main.js";
const shebang = "#!/usr/bin/env bun";
const annotation = "// @bun";

const content = await Bun.file(filePath).text();
const lines = content.split("\n");

const idx = lines.findIndex((line) => line.trim() === shebang);
if (idx !== -1 && lines[idx + 1]?.trim() !== annotation) {
    lines.splice(idx + 1, 0, annotation);
    await Bun.write(filePath, lines.join("\n"));
}
