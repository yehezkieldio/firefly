import { createConsola, type FormatOptions } from "consola";

export const logger = createConsola({
    formatOptions: {
        date: false,
        compact: true,
        columns: 0,
    },
});
