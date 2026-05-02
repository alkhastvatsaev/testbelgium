import OpenAI from "openai";

const openai = new OpenAI();
console.log(Object.keys(openai.chat.completions));
