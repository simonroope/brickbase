import fs from "node:fs";

const origRead = fs.readFileSync;
fs.readFileSync = function (this: typeof fs, p: fs.PathOrFileDescriptor, ...rest: unknown[]) {
  const name = String(p);
  if (name.includes("IERC1155Errors")) {
    console.error("READ", name);
    console.error(new Error("trace").stack);
  }
  return Reflect.apply(origRead, this, [p, ...rest]);
} as typeof fs.readFileSync;

const origOpen = fs.openSync;
if (origOpen) {
  fs.openSync = function (this: typeof fs, p: fs.PathOrFileDescriptor, ...rest: unknown[]) {
    const name = String(p);
    if (name.includes("IERC1155Errors")) {
      console.error("OPEN", name);
      console.error(new Error("trace").stack);
    }
    return Reflect.apply(origOpen, this, [p, ...rest]);
  } as typeof fs.openSync;
}
