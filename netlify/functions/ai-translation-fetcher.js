import OpenAI from "openai";

const headers = {
    "Access-Control-Allow-Origin": "*",  // Allow all origins (or specify your frontend URL)
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
};

export async function handler(event) {
    console.log('FETCHER: fetch_tr_called');
    console.dir(event);
    // 🛑 Handle Preflight OPTIONS request
    if (event.httpMethod === "OPTIONS") {
        console.log('OPT');
        return {
            statusCode: 204, // No Content
            headers: headers,
            body: ""
        };
    }

    const { words, targetLanguage } = JSON.parse(event.body);
    
    if (!words || words.length === 0) {
        console.log('FETCHER: empty words');
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Words list cannot be empty." }) };
    }

    if (!process.env.OPENAI_KEY) {
        console.log('FETCHER: no valid openai key');
        return { statusCode: 400, headers, body: JSON.stringify({ error: "No OpenAI Key" }) };
    }

    const openai = new OpenAI({
        apiKey: process.env.OPENAI_KEY
    });

    const prompt = `
    You are a multilingual linguistics expert and wordplay specialist. Your task is to generate multiple-choice options for a vocabulary learning game.

    Given:
    - A list of words: ${JSON.stringify(words)}
    - Source Language: you need to detect source languange from the words
    - Target Language: ${targetLanguage}

    For each word w_i:
    1. **correct_i** → The **exact translation** of w_i into the target language. When target language equals source language, provide the best synonym you can find.
    2. **related_i** → A **random unrelated and incorrect translation**, meaning is NOT the correct translation. 
    3. **other_i1** and **other_i2** → Two **funny words** in the target language that are completely **unrelated** to w_i.

    Return the output as a structured list of objects in JSON format:
    \`\`\`json
    [
    {   
        "question": "w_1",
        "correct": "exact_translation_1",
        "related": "related_but_incorrect_1",
        "other1": "funny_unrelated_word_1",
        "other2": "funny_unrelated_word_2"
    },
    {
        "question": "w_2",
        "correct": "exact_translation_2",
        "related": "related_but_incorrect_2",
        "other1": "funny_unrelated_word_3",
        "other2": "funny_unrelated_word_4"
    }
    ]
    \`\`\`
    Ensure the **unrelated words** are humorous but still understandable in the target language. Return **only** the JSON output without any additional text.
    Every word should be unique and not repeated in the output.
    Every word should have its first letter capitalized.
    `;

    try {
        console.log('FETCHER: calling oai...');
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "system", content: prompt }],
            max_tokens: 2500,
            temperature: 0.7,
        });
        console.log('FETCHER: oai done');

        const textResponse = response.choices[0].message.content.trim();
        const jsonMatch = textResponse.match(/\[.*\]/s);

        if (!jsonMatch) {
            console.log('FETCHER: no json match');
            throw new Error("Failed to extract JSON from OpenAI response.");
        }

        console.log('FETCHER: success');
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(JSON.parse(jsonMatch[0])),
        };
    } catch (error) {
        console.error("FETCHER: Error fetching translations:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: "Internal server error" }),
        };
    }
}
