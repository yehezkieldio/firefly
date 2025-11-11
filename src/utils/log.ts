import { createConsola, type FormatOptions } from "consola";

const formatOptions: FormatOptions = {
    date: false,
    compact: true,
    columns: 0,
};

export const logger = createConsola({
    formatOptions,
});
