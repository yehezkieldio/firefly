import { type ConsolaInstance, createConsola, type FormatOptions, type LogObject } from "consola";
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
        /**
         * There has to be a better way to do this...
         * I am sorry if my perfectionism is annoying, but I like fancy things.
         */
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
