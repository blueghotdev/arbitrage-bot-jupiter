import { config } from "dotenv";

config()

const required = (name: string): string => {
    const value = process.env[name];
    if (!value) {
        console.error(`${name} is not set`);
        process.exit(1);
    }
    return value;
};

const privateKey = required("PRIVATE_KEY");
const mainnetRPC = required("MAINNET_RPC");

// This is the margin the round trip has to clear before a transaction is sent.
// parseInt returns NaN for anything it cannot read, and every comparison
// against NaN is false - so a typo here does not raise the bar, it removes it,
// and the bot sends transactions on quotes that came back at a loss.
const rawUpperAmount = process.env.UPPER_AMOUNT_WITH_DECIMAL || "0";
const upperAmountWithDecimal = Number(rawUpperAmount);
if (!Number.isFinite(upperAmountWithDecimal) || upperAmountWithDecimal < 0) {
    console.error(
        `UPPER_AMOUNT_WITH_DECIMAL must be a non-negative number, got "${rawUpperAmount}"`
    );
    process.exit(1);
}

export {
    privateKey,
    mainnetRPC,
    upperAmountWithDecimal
}
