import { type ConsolaInstance, type FormatOptions, type LogObject, createConsola } from "consola";
import { colors } from "consola/utils";

const opts: FormatOptions = {
    date: false,
    compact: true,
    columns: 0,
};

const _logger = createConsola({
    formatOptions: opts,
});

export const logger: ConsolaInstance = createConsola({
    formatOptions: opts,
    reporters: [
        {
            log(logObj: LogObject) {
                if (logObj.type === "verbose") {
                    console.log(colors.gray(logObj.args.join(" ")));
                } else {
                    _logger.log(logObj);
                }
            },
        },
    ],
});
