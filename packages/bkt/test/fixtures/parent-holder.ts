export {};

const child = Bun.spawn([process.execPath, process.argv[2]], { stdin: "pipe", stdout: "pipe", stderr: "inherit", env: { ...process.env, BKT_SIDECAR: "1" } });
const reader = child.stdout.getReader();
const first = new TextDecoder().decode((await reader.read()).value);
console.log(first.trim());
setInterval(() => {}, 1000);
