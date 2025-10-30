// This file is used to store server-side configuration,
// such as API keys and other sensitive information.
// It is important to not expose this file to the client-side.

type ServerConfig = {
    alphaVantageApiKey: string | null;
}

export const serverConfig: ServerConfig = {
    alphaVantageApiKey: process.env.ALPHAVANTAGE_API_KEY || null,
};
