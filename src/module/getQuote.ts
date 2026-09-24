import { fetch, request , ProxyAgent} from 'undici';
import type { JupiterQuoteResponse } from '../types';
import { SLIPPAGE_BPS, SWAP_QUOTE_BASE_URL } from '../constant/url';

// Jupiter answers "no route for this pair right now" with 200 and a body that
// carries an error instead of a quote. The cast accepted it, and the shape only
// came apart further down: outAmount went into the next URL as the literal
// string "undefined", and routePlan.map threw with no mention of the quote.
const assertQuote = (body: unknown, label: string): JupiterQuoteResponse => {
    const quote = body as Partial<JupiterQuoteResponse> & { error?: string };

    if (quote?.error) {
        throw new Error(`${label} rejected: ${quote.error}`);
    }
    if (!quote?.outAmount || !Array.isArray(quote.routePlan)) {
        throw new Error(`${label} came back without a route: ${JSON.stringify(body)}`);
    }

    return quote as JupiterQuoteResponse;
};

const getJupiterQuote = async (
    quoteUrl : string,
    baseCoin: string,
    quoteCoin: string,
    amountIn: number
): Promise<{ quote1: JupiterQuoteResponse; quote2: JupiterQuoteResponse }> => {
    const quote1Url = `${quoteUrl}?inputMint=${baseCoin}&outputMint=${quoteCoin}&amount=${amountIn}&slippageBps=${SLIPPAGE_BPS}`;

    const res1 = await fetch(quote1Url);
    // const res1 = await fetch(quote1Url, {
    //     dispatcher: client,
    // });
    if (!res1.ok) throw new Error(`quote1 fetch failed: ${res1.status}`);
    const quote1 = assertQuote(await res1.json(), "quote1");

    const quote2Url = `${quoteUrl}?inputMint=${quoteCoin}&outputMint=${baseCoin}&amount=${quote1.outAmount}&slippageBps=${SLIPPAGE_BPS}`;

    const res2 = await fetch(quote2Url);
    // const res2 = await fetch(quote2Url, {
    //     dispatcher: client,
    // });
    if (!res2.ok) throw new Error(`quote2 fetch failed: ${res2.status}`);
    const quote2 = assertQuote(await res2.json(), "quote2");



    const route = [...quote1.routePlan.map(ele => ele.swapInfo.label),
    ...quote2.routePlan.map(ele => ele.swapInfo.label)]

    console.log(route.join(" -> "));

    return { quote1, quote2 };
};

const fetchSwapInstructions = async (data1: JupiterQuoteResponse, data2: JupiterQuoteResponse, userPublicKey: string): Promise<{ ix1: any; ix2: any }> => {

    const body1 = JSON.stringify({
        quoteResponse: data1,
        wrapAndUnwrapSol: false,
        useSharedAccounts: false,
        userPublicKey,
    });

    const body2 = JSON.stringify({
        quoteResponse: data2,
        wrapAndUnwrapSol: false,
        useSharedAccounts: false,
        userPublicKey,
    });

    const headers = {
        'Content-Type': 'application/json',
    };

    const [res1, res2] = await Promise.all([
        request('https://quote-api.jup.ag/v6/swap-instructions', {
            method: 'POST',
            headers,
            body: body1,
        }),
        request('https://quote-api.jup.ag/v6/swap-instructions', {
            method: 'POST',
            headers,
            body: body2,
        }),
    ]);

    const [ix1, ix2] = await Promise.all([res1.body.json(), res2.body.json()]);

    return { ix1, ix2 }; // Return the results as an object

};


export {
    getJupiterQuote,
    fetchSwapInstructions
}