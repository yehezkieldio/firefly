import { type ConsolaInstance, createConsola } from "consola";

export const logger: ConsolaInstance = createConsola({
    formatOptions: {
        date: false,
        compact: true
    }
});
