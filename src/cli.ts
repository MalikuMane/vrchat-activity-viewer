import * as path from "path";
import * as fs from "fs";
import { program } from "commander";
import { app } from "./app";

const version = JSON.parse(fs.readFileSync(path.resolve(__dirname, "..", "package.json"), "utf8")).version;

program
    .version(version, "-v, --version", "output the current version");

program
    .description("VRChat log viewer")
    .option("-f, --filter <word...>", "filter logs with ignore case words")
    .option("-cf, --case-filter <word...>", "filter logs with no ignore case words")
    .option("-i, --import <dir>", "log directory to import additional")
    .option("-V, --verbose", "display full log details")
    .option("-r, --range <hours>", "specify the range to display", "24")
    .option("-w, --watch <sec>", "update db repeatedly")

export async function run(argv: any): Promise<void> {
    program.parse(argv);
    app({
        import: program["import"],
        filter: program["filter"],
        caseFilter: program["caseFilter"],
        verbose: program["verbose"],
        range: program["range"],
        watch: program["watch"]
    });
}
