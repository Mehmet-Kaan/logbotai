import express from 'express';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import path from "path";
import { dirname, join } from 'path';

import textToSpeech from '@google-cloud/text-to-speech';
import fs from 'fs';
import util from 'util';

//Javascripts own library for tokenizing
// import natural from 'natural';

import bodyParser from 'body-parser';
// import multer from 'multer';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
// app.use(express.json());
// app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));
app.use(cors());

//To get data from BigQuerry
import { BigQuery } from '@google-cloud/bigquery';
import { PubSub } from '@google-cloud/pubsub';

//Imports openai
import OpenAI from "openai";
const openai = new OpenAI();
const latestAIModel = "gpt-4o-mini";

//Cheapest openai model text-embedding-3-small, better than text-embedding-ada-002
const embeddingModel = "text-embedding-3-small";
// The maximum token limit for text-embedding-3-small
const maxTokenLimit = 8000; 

import { decode, encode } from 'gpt-3-encoder';
import { encoding_for_model } from "@dqbd/tiktoken";
import crypto from 'crypto';

//Imports Groq
import Groq from "groq-sdk";
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
// const ollamaModel = "llama3-8b-8192";
const ollamaModel = "llama-3.3-70b-versatile";

//Imports Huggingface
import { HfInference } from "@huggingface/inference";
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

//Huggingface tokenizer
// import tokenizers from 'tokenizers';
// const { Tokenizer } = tokenizers;
import { AutoTokenizer } from '@huggingface/transformers';
import { group } from 'console';

const port = process.env._PORT || 8080;
process.env.GOOGLE_APPLICATION_CREDENTIALS = "./service-account-key.json";

app.get("/wakeup", (req, res) => {

    // res.json({"users": ["asa", "taylor", "alisson"]});
    res.send("Server is awake");
})

// Function to periodically ping the /wakeup endpoint
function startPingingServer() {
    setInterval(async () => {
        try {
            const response = await fetch("https://logbotai-backend.onrender.com/wakeup");
            const text = await response.text();
            console.log(`Server response: ${text}`);
        } catch (error) {
            console.error("Error pinging /wakeup endpoint:", error);
        }
    }, 3 * 60 * 1000); // 3 minutes in milliseconds
}

//LogBotAI
// Get the current directory of the module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
let authorizationCodes = ["mehmet1234","test1test"];

app.post('/openaiTTE', async (req, res) => {
    const enc = encoding_for_model(embeddingModel);
    const embedded = [];
    const processedHashes = new Set(); // Store hashes to avoid duplication

    // Function to compute a hash for deduplication
    const computeHash = (text) => crypto.createHash('sha256').update(text).digest('hex');

    async function countTokens(text) {
        const tokens = enc.encode(text);
        return tokens.length;
    }

    function splitTextByTokens(text) {
        const tokens = enc.encode(text);
        const chunks = [];

        for (let i = 0; i < tokens.length; i += maxTokenLimit) {
            const tokenChunk = tokens.slice(i, i + maxTokenLimit);
            const textChunk = enc.decode(tokenChunk);
            chunks.push(textChunk);
        }
        return chunks;
    }

    async function processFile(text) {
        let decodedText = text;
        try {
            if (typeof decodedText !== 'string') {
                const decoder = new TextDecoder();
                decodedText = decoder.decode(text);
            }

            const embedding = await openai.embeddings.create({
                model: "text-embedding-ada-002",
                input: decodedText,
            });

            return embedding.data[0].embedding;
        } catch (error) {
            console.error("Error creating embedding:", error);
        }
    }
    
    for (let file of req.body.filesContents) {
        const fileContent = typeof file.content === 'object' 
            ? JSON.stringify(file.content) 
            : file.content.toString();

        const fileHash = computeHash(fileContent);
        
        if (processedHashes.has(fileHash)) {            
            console.log(`Skipping duplicate file: ${file.name}`);
            continue;
        }

        processedHashes.add(fileHash);

        const tokenCount = await countTokens(fileContent);

        if (tokenCount > maxTokenLimit) {
            const texts = splitTextByTokens(fileContent);

            for (let text of texts) {
                let embeddedTextForFile = await processFile(text);
                embedded.push({ name: file.name, embeddedText: embeddedTextForFile, content: file.content });
            }
        } else {
            let embeddedTextForFile = await processFile(fileContent);
            embedded.push({
                name: file.name,
                embeddedText: embeddedTextForFile,
                content: file.content,
            });
        }
    }

    res.status(200).json({ message: "success", embedded });
});
// app.post('/textToEmbedd', async (req, res) => {
//     const enc = encoding_for_model("text-embedding-ada-002");
//     let embedded = [];
//     // let originalTexts = [];

//     // Function to count tokens in a text
//     async function countTokens(text) {
//         const tokens = enc.encode(text);
//         return tokens.length;
//     }

//     // Function to split the text into chunks of tokens
//     function splitTextByTokens(text) {
//         const tokens = enc.encode(text);
//         const chunks = [];

//         for (let i = 0; i < tokens.length; i += maxTokenLimit) {
//             const tokenChunk = tokens.slice(i, i + maxTokenLimit);
//             const textChunk = enc.decode(tokenChunk);
//             chunks.push(textChunk);
//         }
//         return chunks;
//     }

//     // Function to process the file content
//     async function processFile(text) {
//         // const decoder = new TextDecoder();
//         // const decodedText = decoder.decode(text);
//         let decodedText = text;
//         try {
//             if (typeof decodedText !== 'string') {

//                 // throw new Error(`Expected a string, but got: ${typeof decodedText}`);
//                 const decoder = new TextDecoder();
//                 decodedText = decoder.decode(text);
//             }
    
//             const embedding = await openai.embeddings.create({
//                 model: "text-embedding-ada-002",
//                 input: decodedText,
//             });
//             // console.log(embedding.data[0].embedding);
//             return embedding.data[0].embedding;
//         } catch (error) {
//             console.error("Error creating embedding:", error);
//         }
//     }

//     for (let file of req.body.filesContents) {
//         const fileContent = typeof file.content === 'object' ? JSON.stringify(file.content) : file.content.toString();
//         // console.log('File content type:', typeof fileContent);
        
//         const tokenCount = await countTokens(fileContent); 
    
//         if (tokenCount > maxTokenLimit) {
//             const texts = splitTextByTokens(fileContent);

//             for (let text of texts) {
//                 let embeddedTextForFile = await processFile(text);
//                 embedded.push({name: file.name, embeddedText: embeddedTextForFile, content:file.content });
//             }
//         } else {
//             // embedded.push(await processFile(fileContent));
//             let embeddedTextForFile = await processFile(fileContent);
//             embedded.push({name: file.name, embeddedText: embeddedTextForFile, content:file.content, formatedContent:file.formatedContent });
//         }
//     }

//     res.status(200).json({ message: "success" , embedded});
// });
app.post("/chat", async (req, res) => {

    const cosineSimilarity = (vecA, vecB) => {
        if (!vecA || !vecB || vecA.length !== vecB.length) {
            console.error('Invalid embeddings:', vecA, vecB);
            // throw new Error('Embedding vectors are either null or have mismatched lengths.');
        }
    
        const dotProduct = vecA.reduce((sum, value, index) => sum + value * vecB[index], 0);
        const magnitudeA = Math.sqrt(vecA.reduce((sum, value) => sum + value * value, 0));
        const magnitudeB = Math.sqrt(vecB.reduce((sum, value) => sum + value * value, 0));
        return dotProduct / (magnitudeA * magnitudeB);
    };

    const searchEmbeddings = (queryEmbedding, storedEmbeddings) => {        
        const results = storedEmbeddings.map((embedding, index) => {            
            const similarity = cosineSimilarity(queryEmbedding, embedding);              
            return { index, similarity };
        });
        
        results.sort((a, b) => b.similarity - a.similarity);
        return results.slice(0, 10); // Top N results
    };

    const handleSearch = async (question, storedEmbeddings, originalTexts, conversation) => {
        const queryResponse = await openai.embeddings.create({
            model: embeddingModel,
            input: question,
        });
        
       // Step 1: Get the embedding for the user's question
        const queryEmbedding = queryResponse.data[0].embedding;
        
        // Step 2: Retrieve similar results based on the embeddings
        const similarResults = searchEmbeddings(queryEmbedding, storedEmbeddings);

        // Step 3: Get the relevant texts from your data source
        const relevantTexts = similarResults.map(result => originalTexts[result.index]);

        let previousConversation = conversation.reverse();

        previousConversation.push(
            { role: "system", content: "Du är en assistent som svarar på frågor baserat på följande kontext." },
            {
                role: "user",
                content: `Här är några relevanta texter:\n- ${relevantTexts.join('\n- ')}\nAnvänd dessa texter för att svara på frågan nedan.`
            },
        )

        let conversationsToAI = previousConversation.reverse();

        conversationsToAI.push({ role: "user", content: `Här är min fråga: ${question}` });

        // Step 4: Create the OpenAI API request
        const completionResponse = await openai.chat.completions.create({
            model: latestAIModel,
            messages: conversationsToAI,
            temperature: 0
        });

        // const completionResponse = await openai.chat.completions.create({
        //     // model: "gpt-3.5-turbo",
        //     model: "gpt-4o-mini",
        //     messages: [
        //         { role: "system", content: "Du är en assistent som svarar på frågor baserat på följande kontext." },
        //         {
        //             role: "user",
        //             content: `Här är några relevanta texter:\n- ${relevantTexts.join('\n- ')}\nAnvänd dessa texter för att svara på frågan nedan.`
        //         },
        //         { role: "user", content: `Här är min fråga: ${question}` }
        //     ],
        //     temperature: 0
        // });
    
        // console.log(question);
        // console.log(conversationsToAI);
        
        // console.log(completionResponse.choices[0].message.content);
        return completionResponse.choices[0].message.content;
    };
    
    // Example search
    let answer = await handleSearch(req.body.question, req.body.storedEmbeddings, req.body.originalTexts, req.body.conversation);

    res.status(200).json({ message: "success" , answer});
});
app.post('/getTextSnipp', async (req, res) => {

    const handleFindingText = async(textToLocate, allText) => {

        const completionResponse = await openai.chat.completions.create({
            model: latestAIModel,
            messages: [
                { role: "system", content: "You are a text locater. I will provide you a text and i want you to find where that text can be taken from. Answer me only with the sentences or phragraph that you located the text in!" },
                {
                    role: "user",
                    content: `Here is the text the whole text i want you to search through:\n- ${allText}\n Use this texts to locate the text down below.`
                },
                { role: "user", content: `Here is the text i want you to locate: ${textToLocate}` }
            ]
        });

        return completionResponse.choices[0].message.content;
    }

    let textSnipp = await handleFindingText(req.body.textToLocate, req.body.allText);

    res.status(200).json({ message: "success" , textSnipp});
});

app.post('/generatePodcast', async (req, res) => {
    const { authorization } = req.headers;
    // const outputFilePath = path.join(__dirname, `Saatçinin Sırrı.mp3`);
    
    // try {
    //     // Check if the file exists
    //     if (fs.existsSync(outputFilePath)) {
    //         console.log(`Returning existing audio file: ${outputFilePath}`);

    //         // Read the file as a buffer
    //         const audioBuffer = await fs.promises.readFile(outputFilePath);

    //         // Encode as Base64
    //         const base64Audio = audioBuffer.toString('base64');

    //         // Send the response with the existing file
    //         res.status(200).json({
    //             message: 'Podcast retrieved successfully',
    //             podcastBase64: `data:audio/mp3;base64,${base64Audio}`,
    //             title:req.body.title
    //         });

    //         // After sending the response, delete the file
    //         try {
    //             let fileExist = await fs.promises.access(outputFilePath)
    //             console.log(fileExist);
                
    //             setTimeout(async() => {
    //                 // await fs.promises.unlink(outputFilePath); // Deletes the file
    //                 console.log(`File ${outputFilePath} deleted successfully.`);
    //             }, 1000 * 20);
    //         } catch (error) {
    //             console.error(`Error deleting file ${outputFilePath}:`, error);
    //         }

    //     } else {
    //         res.status(404).json({ message: 'Audio file not found' });
    //     }
    // } catch (error) {
    //     console.error('Error retrieving audio file:', error);
    //     res.status(500).json({ message: 'Error retrieving audio file' });
    // }
    // return;

    if(authorization && authorizationCodes.includes(authorization)){     
        const { allText, title } = req.body;

        async function refineScript(allText) {
            try {
                const response = await openai.chat.completions.create({
                    model: latestAIModel,
                    messages: [
                        { role: 'system', content: 'You are a podcast editor.' },
                        { role: 'user', content: `Add the names; "Presenter" and "Guest" for each speecher before their speech in the script. Edit this script to make it more engaging and conversational:\n\n${allText}`}
                    ],
                    max_tokens: 1024,
                });
                return response.choices[0].message.content;
            } catch (error) {
                throw new Error(`Error refining script: ${error.message}`);
            }
        }
    
        async function convertToAudio(text, title) {
            const outputFilePath = path.resolve(`./${title}.mp3`);
            const buffers = [];
            let presenterVoice = req.body.presenterVoice;
            let guestVoice = req.body.guestVoice;
            
            try {
                const lines = text.split('\n').filter(line => line.trim() !== '');
    
                for (const line of lines) {
                    // Determine the speaker label and clean the line
                    let voice;
                    let cleanedLine = line.trim()
                        .replace(/^["']/, '') // Remove leading quotes
                        .replace(/["'],?$/, '') // Remove trailing quotes or commas
                        .replace(/\s+/g, ' '); // Replace multiple spaces with a single space
        
                    // console.log("Processing line:", cleanedLine); // Debugging
        
                    // Flexible regular expressions to handle variations in speaker labels
                    if (/^\*\*Presenter:\s*/i.test(cleanedLine)) {
                        voice = presenterVoice; // Presenter voice
                        cleanedLine = cleanedLine.replace(/^\*\*Presenter:\s*/i, '').trim(); // Remove the label
                    } else if (/^\*\*Guest:\s*/i.test(cleanedLine)) {
                        voice = guestVoice; // Guest voice
                        cleanedLine = cleanedLine.replace(/^\*\*Guest:\s*/i, '').trim(); // Remove the label
                    } else {
                        console.warn("No recognized speaker label, defaulting to Presenter voice.");
                        voice = 'alloy'; // Default to Presenter voice
                    }
        
                    // console.log(`Using voice ${voice} for text:`, cleanedLine);
    
                    // Send the cleaned line to the TTS API
                    const mp3 = await openai.audio.speech.create({
                        model: 'tts-1',
                        voice,
                        input: cleanedLine,
                    });
    
                    const buffer = Buffer.from(await mp3.arrayBuffer());
                    buffers.push(buffer);
                }
    
                // Combine and save the audio files
                const combinedBuffer = Buffer.concat(buffers);
                await fs.promises.writeFile(outputFilePath, combinedBuffer);
    
                return combinedBuffer;
            } catch (error) {
                throw new Error(`Error generating audio: ${error.message}`);
            }
        }
    
        try {
            console.log('Refining script...');
            const refinedScript = await refineScript(allText);
            // const refinedScript = allText;
    
            console.log('Generating audio...');
            const audioBuffer = await convertToAudio(refinedScript, title);
    
            // Encode as Base64
            const base64Audio = audioBuffer.toString('base64');
            res.status(200).json({
                message: 'Podcast generated successfully',
                // script:refinedScript,
                podcastBase64: `data:audio/mp3;base64,${base64Audio}`,
                title:req.body.title
            });

            // After sending the response, delete the file  
            // try {
            //     setTimeout(async() => {
            //         await fs.promises.unlink(audioBuffer); // Deletes the file
            //         console.log(`File ${audioBuffer} deleted successfully.`);
            //     }, 1000 * 30);
            // } catch (error) {
            //     console.error(`Error deleting file ${audioBuffer}:`, error);
            // }

        } catch (error) {
            console.error('Error generating podcast:', error);
            res.status(500).json({ message: error.message });
        }
    }else{
        console.error('Authorization code is wrong or does not exist!');
        res.status(501).json({ message: "Not authorized! Authorization code is wrong or does not exist! Please enter correct code!" });
    }
});

//With max token limits
app.post('/generatePodcastOld', async (req,res)=>{
    // const speechFile = path.resolve(`./${req.body.title}.mp3`);

    const refineScript = async(allText) => {
        try {
            const completionResponse = await openai.chat.completions.create({
                model: latestAIModel,
               "messages": [
                    {"role": "system", "content": "You are a podcast editor."},
                    {"role": "user", "content": `Add the names; "presenter" and "guest" for each speecher before their speech in the script. Edit this script to make it more engaging and conversational:\n\n${allText}`}
                ],
                max_tokens:1024
        });
            return completionResponse.choices[0].message.content;
        } catch (error) {
            console.error('Error refining script:', error);
            throw error;
        }
    }

    // Function to convert text to speech using Google TTS
    async function convertToAudio(text) {
    
        const maxChunkLength = 300; // Maximum characters per chunk
        const presenterVoice = "alloy"; // Voice ID for Presenter
        const guestVoice = "amber"; // Voice ID for Guest
    
        // Function to split a long text into smaller chunks while preserving words
        function splitTextIntoChunks(text, maxLength) {
            const words = text.split(" ");
            const chunks = [];
            let currentChunk = "";
    
            for (const word of words) {
                if ((currentChunk + word).length > maxLength) {
                    chunks.push(currentChunk.trim());
                    currentChunk = word + " ";
                } else {
                    currentChunk += word + " ";
                }
            }
            if (currentChunk.trim()) {
                chunks.push(currentChunk.trim());
            }
            return chunks;
        }
    
        // Split the script into chunks by speaker
        const chunks = [];
        const lines = text.split("\n").filter(line => line.trim() !== "");
        lines.forEach(line => {
            if (line.startsWith("**Presenter**:")) {
                const text = line.replace("**Presenter**:", "").trim();
                const speakerChunks = splitTextIntoChunks(text, maxChunkLength);
                speakerChunks.forEach(chunk => chunks.push({ text: chunk, voice: presenterVoice }));
            } else if (line.startsWith("**Guest**:")) {
                const text = line.replace("**Guest**:", "").trim();
                const speakerChunks = splitTextIntoChunks(text, maxChunkLength);
                speakerChunks.forEach(chunk => chunks.push({ text: chunk, voice: guestVoice }));
            }
        });
    
        // Process each chunk and generate audio
        const buffers = [];
        try {
            for (const { text, voice } of chunks) {
                console.log(`Generating audio for voice ${voice}: ${text}`);
    
                const mp3 = await openai.audio.speech.create({
                    model: "tts-1",
                    voice: voice,
                    input: text,
                });
    
                // Save the audio buffer for each chunk
                const buffer = Buffer.from(await mp3.arrayBuffer());
                buffers.push(buffer);
            }
    
            // Combine all buffers into a single audio file
            const combinedBuffer = Buffer.concat(buffers);
            const outputFilePath = path.resolve(`./${req.body.title}.mp3`);
            await fs.promises.writeFile(outputFilePath, combinedBuffer);
    
            console.log(`Audio content written to file: ${outputFilePath}`);
            return combinedBuffer;
        } catch (error) {
            console.error("Error generating audio:", error);
            throw error;
        }


        // const MAX_CHUNK_LENGTH = 300; // Set this to the maximum allowed characters for the API
        // const chunks = [];
    
        // // Split text into chunks of MAX_CHUNK_LENGTH
        // for (let i = 0; i < text.length; i += MAX_CHUNK_LENGTH) {
        //     chunks.push(text.slice(i, i + MAX_CHUNK_LENGTH));
        // }
    
        // const buffers = [];
    
        // try {
        //     for (const chunk of chunks) {
        //         console.log(`Processing chunk: ${chunk}`);
                
        //         // Generate audio for each chunk
        //         const mp3 = await openai.audio.speech.create({
        //             model: "tts-1",
        //             voice: "alloy",
        //             input: chunk,
        //         });
    
        //         // Save the audio buffer for each chunk
        //         const buffer = Buffer.from(await mp3.arrayBuffer());
        //         buffers.push(buffer);
        //     }
    
        //     // Concatenate all buffers into one
        //     const combinedBuffer = Buffer.concat(buffers);
    
        //     // Save the combined audio file
        //     await fs.promises.writeFile(speechFile, combinedBuffer);
        //     console.log(`Audio content written to file: ${speechFile}`);
            
        //     return combinedBuffer;
        // } catch (error) {
        //     console.error('Error generating audio:', error);
        //     throw error;
        // }
    


        
        // try {
        //     const mp3 = await openai.audio.speech.create({
        //         model: "tts-1",
        //         voice: "alloy",
        //         input: text,
        //     });

        //     // Save the audio content to a file
        //     const buffer = Buffer.from(await mp3.arrayBuffer());
        //     await fs.promises.writeFile(speechFile, buffer);            
        //     return buffer;
        // } catch (error) {
        //     console.error('Error generating audio:', error);
        //     throw error;
        // }
    }

    try {
        const allText = req.body.allText;
        const titleOfThePodcast = req.body.title;

        console.log('Refining script...');
        const refinedScript = await refineScript(allText);
        // const refinedScript = allText;

        console.log('Generating audio...');
        const outputFilePath = join(__dirname, `${titleOfThePodcast}.mp3`);
        const audioContent = await convertToAudio(refinedScript);

        // Send audio content as base64 string
        res.status(200).json({
            message: "Podcast generated successfully",
            podcastBase64: `data:audio/mp3;base64,${audioContent.toString('base64')}`,
            filePath: outputFilePath,
        });
    } catch (error) {
        console.error('Error in /generatePodcast:', error);
        res.status(500).json({ message: 'Error generating podcast', error });
    }
})

//Endpoint for the voice generation by using Google Cloud TTS (Text To Speech)
// app.post('/generatePodcastWithCloudTTS', async (req,res)=>{
//     //Text-to-Speech from Google Cloud
//     // Initialize the client with service account credentials
//     const ttsClient = new textToSpeech.TextToSpeechClient({
//         keyFilename: "./service-account-key.json",
//     });
    
//     const refineScript = async(allText) => {
//         try {
//             const completionResponse = await openai.chat.completions.create({
//                 model: latestAIModel,
//                "messages": [
//                     {"role": "system", "content": "You are a podcast editor."},
//                     {"role": "user", "content": `Edit this script to make it more engaging and conversational:\n\n${allText}`}
//                 ]
//         });
//             return completionResponse.choices[0].message.content;
//         } catch (error) {
//             console.error('Error refining script:', error);
//             throw error;
//         }
//     }

//     // Function to convert text to speech using Google TTS
//     async function convertToAudio(text, outputPath) {
//         const request = {
//             input: { text },
//             voice: { languageCode: 'en-US', ssmlGender: 'NEUTRAL' },
//             audioConfig: { audioEncoding: 'MP3' },
//         };
    
//         try {
//             const [response] = await ttsClient.synthesizeSpeech(request);
//             // const writeFile = util.promisify(fs.writeFile);
//             // await writeFile(outputFilePath, response.audioContent, 'binary');
//             // console.log(`Audio content written to file: ${outputFilePath}`);

//               // Save the audio content to a file
//             const writeFile = util.promisify(fs.writeFile);
//             await writeFile(outputPath, response.audioContent, 'binary');
//             console.log(`Audio content saved to file: ${outputPath}`);
            
//             return response.audioContent;
//         } catch (error) {
//             console.error('Error generating audio:', error);
//             throw error;
//         }
//     }

//     try {
//         const allText = req.body.allText;
//         const titleOfThePodcast = req.body.title;

//         console.log('Refining script...');
//         const refinedScript = await refineScript(allText);
//         // const refinedScript = allText;

//         console.log('Generating audio...');
//         const outputFilePath = join(__dirname, `${titleOfThePodcast}.mp3`);
//         const audioContent = await convertToAudio(refinedScript, outputFilePath);

//         // Send audio content as base64 string
//         res.status(200).json({
//             message: "Podcast generated successfully",
//             podcastBase64: `data:audio/mp3;base64,${Buffer.from(audioContent).toString('base64')}`,
//             filePath: outputFilePath,
//         });
//     } catch (error) {
//         console.error('Error in /generatePodcast:', error);
//         res.status(500).json({ message: 'Error generating podcast', error });
//     }



//     // async function generatePodcast(script, outputPath) {
//     //     try {
//     //     console.log('Refining script...');
//     //     const refinedScript = await refineScript(script);
    
//     //     console.log('Converting script to audio...');
//     //     await convertToAudio(refinedScript, outputPath);
//     //     } catch (error) {
//     //     console.error('Error generating podcast:', error);
//     //     }
//     // }
 
//     // const outputFilePath = 'podcast_episode.mp3';

//     // let podcast = await generatePodcast(req.body.allText, outputFilePath);

//     // res.status(200).json({ message: "success" , podcast});

// })

//Ask Gandalf
const ideas = [];
const conversations = [];
const images = [];
app.post("/postNewIdea", async (req, res) => {
    
    try {
        const { authorization } = req.headers;
        if(authorization && authorization === "gandalf"){
            // let afterPrompt = ` (Act as Gandalf from the Lord of the Rings analys the idea only by wearing the ${req.body.hat} hat from the six thinkings hat. Do not reveal that you're Gandalf and wearing any hat. Please do not mention any explaination about thinking hats neither in your response.)`;
            // let promptToAI = req.body.title + afterPrompt;
            const { title, date, conversations, hat } = req.body;
    
            let promptToAI = title;
            
            let maxLimit = 4000;
            let currentTokens = 57;
            
            let lastPrompt = conversations[conversations.length-1];
            
            //Opens up space for the latest prompt        
            maxLimit -= encode(lastPrompt.role).length + encode(lastPrompt.content).length;
            
            let countedConversation = [];
    
            for (let index = 0; index < conversations.length-1; index++) {
                if(currentTokens >= maxLimit){
                    break;
                }
                const conversation = conversations[index];
                currentTokens += encode(conversation["role"]).length + encode(conversation["content"]).length;
                countedConversation.push(conversation);
            }
    
            //Pushing in latest prompt!
            countedConversation.push(lastPrompt);
    
            //OpenAI - Communication here
            const timeBefore = new Date().getTime();
    
            async function askAI() {      
            const completion = await openai.chat.completions.create({
                model: latestAIModel,
                messages: countedConversation,
                temperature:0,
              });
              
              return completion.choices[0].message.content;
            }
    
            let response = await askAI();
    
            const timeAfter = new Date().getTime();
    
            let responceTimeFromAI = parseInt(timeAfter) - parseInt(timeBefore);
    
            const newConversation = {
                "Id":ideas.length,
                "Title": title,
                "Date": date,
                "Response":response,
                "Hat": hat,
                "promptToAI:":promptToAI,
                "responceTimeFromAI":responceTimeFromAI,
            }
            ideas.push(newConversation);
            res.status(201).send(newConversation); 
    
            //Firestore / Firebase - Logga in
        }else{
            res.status(403).send("Sorry! You are not Gandalf.");
        }
    } catch (error) {
        res.status(410).send("Gandalf is not avaliable right now!");
    } 
})
app.post("/generateImage", async (req, res) => {
    
    try {
        const { authorization } = req.headers;
        if(authorization && authorization === "gandalf"){
            const { description, date } = req.body;
    
            //OpenAI - Communication here
            const timeBefore = new Date().getTime();
    
            async function askAI() {      
                // const image = await openai.createImage({
                //     prompt: description,
                //     n: 1,
                //     size: "512x512",
                // });
    
                const image = await openai.images.generate({
                    prompt: description,
                    n: 2,
                    size: "512x512",
                });
    
                return image.data;
            }
    
            let response = await askAI();
    
            const timeAfter = new Date().getTime();
    
            let responceTimeFromAI = parseInt(timeAfter) - parseInt(timeBefore);
    
            const generatedImage = {
                "id":images.length,
                "url":response,
                "Title": description,
                "Date": date,
                "promptToAI":description,
                "responceTimeFromAI":responceTimeFromAI,
            }
    
            ideas.push(generatedImage);
            res.status(201).send(generatedImage); 
    
            //Firestore / Firebase - Logga in
        }else{
            res.status(403).send("Sorry! You are not Gandalf.");
        }
    } catch (error) {
        res.status(410).send("Gandalf is not avaliable right now!");
    }
})
app.post("/postConversation",(req, res) => {
    const { authorization } = req.headers;

    if(authorization && authorization === "gandalf"){
        const newConversation = {
            "Id":conversations.length,
            "Title": req.body.title,
            "Date": req.body.date,
            "Hat":req.body.hat,
            "conversation": req.body.conversation
        }

        conversations.push(newConversation);
        res.status(201).send(newConversation);
    }
});
app.post("/postToQuerry",async (req, res) => {
    const { authorization } = req.headers;

    if(authorization && authorization === "gandalf"){
        
        async function saveToQuerry() {      
            const projectId = 'elated-lotus-398211'; // Replace with your GCP project ID
            const topicName = 'AskGandalf'; // Replace with your Pub/Sub subscription name
          
            const pubsub = new PubSub({ projectId });
          
            const topic = pubsub.topic(topicName);
            topic.publishMessage({data : Buffer.from(req.body.data), attributes: req.body.attributes});
        }
        let response = await saveToQuerry();
        res.send(response);
    }
});
app.get("/getFromQuerry", async (req, res) => {
    const { authorization } = req.headers;

    if(authorization && authorization === "gandalf"){
    
        const projectId = 'elated-lotus-398211'; // Replace with your GCP project ID
        const datasetId = 'AskGandalf'; // Replace with your Pub/Sub subscription name
        const tableId = 'Conversations'; // Replace with your BigQuery table ID
        // const columnName = '*'; // * to get all data
        const columnName = req.query.wantedData; // to get a specific information with an get parameter, use query

        const bigquery = new BigQuery({ projectId });
        const dataset = bigquery.dataset(datasetId);
        const table = dataset.table(tableId);

        const query = `SELECT ${columnName} FROM ${datasetId}.${tableId} LIMIT 1000`;

        const options = {
            query: query,
            location: 'EU'
        };

        const [rows] = await bigquery.query(options);
        res.json(rows); 
    }
});
app.get("/conversations", (req, res) => {
    const { authorization } = req.headers;

    if(authorization && authorization === "gandalf"){
        // res.json({"conversations": conversations});
        res.send(conversations);
    }
});

//My Portfolio
app.post("/portfolioAI", async (req, res) => {

    const cosineSimilarity = (vecA, vecB) => {
        if (!vecA || !vecB || vecA.length !== vecB.length) {
            console.error('Invalid embeddings:', vecA, vecB);
            throw new Error('Embedding vectors are either null or have mismatched lengths.');
        }
    
        const dotProduct = vecA.reduce((sum, value, index) => sum + value * vecB[index], 0);
        const magnitudeA = Math.sqrt(vecA.reduce((sum, value) => sum + value * value, 0));
        const magnitudeB = Math.sqrt(vecB.reduce((sum, value) => sum + value * value, 0));
        return dotProduct / (magnitudeA * magnitudeB);
    };

    const searchEmbeddings = (queryEmbedding, storedEmbeddings) => {        
        const results = storedEmbeddings.map((embedding, index) => {
            const similarity = cosineSimilarity(queryEmbedding, embedding);            
            return { index, similarity };
        });
        
        results.sort((a, b) => b.similarity - a.similarity);
        return results.slice(0, 10); // Top N results
    };

    const handleSearch = async (question, storedEmbeddings, originalTexts, conversation) => {
        const queryResponse = await openai.embeddings.create({
            model: "text-embedding-ada-002",
            input: question,
        });
        
       // Step 1: Get the embedding for the user's question
        const queryEmbedding = queryResponse.data[0].embedding;

        // Step 2: Retrieve similar results based on the embeddings
        const similarResults = searchEmbeddings(queryEmbedding, storedEmbeddings);

        // Step 3: Get the relevant texts from your data source
        const relevantTexts = similarResults.map(result => originalTexts[result.index]);

        let previousConversation = conversation.reverse();

        previousConversation.push(
            { 
                role: "system", 
                content: "You are an assistant specifically built to help users who ask questions about Mehmet Kaan Taspunar, answering based on the following context." 
            },
            {
                role: "user",
                content: `Here are some relevant texts:\n- ${relevantTexts.join('\n- ')}\nUse these texts to answer the question below.`
            },
        )

        let conversationsToAI = previousConversation.reverse();

        conversationsToAI.push({ role: "user", content: `Here is my question: ${question}` });

        // Step 4: Create the OpenAI API request
        const completionResponse = await openai.chat.completions.create({
            model: latestAIModel,
            messages: conversationsToAI,
            temperature: 0
        });

        // const completionResponse = await openai.chat.completions.create({
        //     // model: "gpt-3.5-turbo",
        //     model: "gpt-4o-mini",
        //     messages: [
        //         { role: "system", content: "Du är en assistent som svarar på frågor baserat på följande kontext." },
        //         {
        //             role: "user",
        //             content: `Här är några relevanta texter:\n- ${relevantTexts.join('\n- ')}\nAnvänd dessa texter för att svara på frågan nedan.`
        //         },
        //         { role: "user", content: `Här är min fråga: ${question}` }
        //     ],
        //     temperature: 0
        // });
    
        // console.log(question);
        // console.log(conversationsToAI);
        
        // console.log(completionResponse.choices[0].message.content);
        return completionResponse.choices[0].message.content;
    };
    
    // Example search
    let answer = await handleSearch(req.body.question, req.body.storedEmbeddings, req.body.originalTexts, req.body.conversation);

    res.status(200).json({ message: "success" , answer});
});


//Alternatives free ai models
const questionsAsked = [];

//Huggingface
app.post("/huggingfaceEmbedding", async (req, res) => {

    // const tokenizer = await BertWordPieceTokenizer.fromOptions({
    //     vocabFile: './bert-large-uncased-vocab.txt', // Path to the vocab file
    //     lowercase: true,
    // });

    // Tokenization
    // const tokenizer = new natural.WordTokenizer();

    const tokenizer = await AutoTokenizer.from_pretrained('sentence-transformers/bert-base-nli-mean-tokens');

    const embedded = [];
    const processedHashes = new Set(); // Store hashes to avoid duplication

    // Function to compute a hash for deduplication
    const computeHash = (text) => crypto.createHash('sha256').update(text).digest('hex');

    async function countTokens(text) {
        const tokens = tokenizer.encode(text);
        return tokens.length;
    }

    async function splitTextByTokens(text) {
        const tokens = tokenizer.encode(text);  // Get tokens from the text
        const chunks = [];
        const maxTokenLimit = 512; // Define max token limit
    
        if (tokens.length === 0) {
            console.log('No tokens found in the text');
            return [];  // Return an empty array if no tokens are found
        }
    
        // Split the tokens into chunks of maxTokenLimit
        for (let i = 0; i < tokens.length; i += maxTokenLimit) {
            const tokenChunk = tokens.slice(i, i + maxTokenLimit);  // Slice tokens into smaller chunks
            try {
                // Decode the chunk of tokens back to text
                const textChunk = await tokenizer.decode(tokenChunk, { skipSpecialTokens: true });
                chunks.push(textChunk);  // Push the decoded text chunk into the array
            } catch (error) {
                console.error('Error decoding token chunk:', error);
            }
        }
        
        return chunks;
    }

    async function processFile(text) {
        let decodedText = text;
        try {
            if (typeof decodedText !== 'string') {
                const decoder = new TextDecoder();
                decodedText = decoder.decode(text);
            }

            const embedding = await hf.featureExtraction({
            model: "sentence-transformers/all-MiniLM-L12-v2",  // A popular lightweight model
            inputs: text,
        });

            return embedding;
        } catch (error) {
            console.error("Error creating embedding:", error);
        }
    }
    
    for (let file of req.body.filesContents) {
        const fileContent = typeof file.content === 'object' 
            ? JSON.stringify(file.content) 
            : file.content.toString();

        const fileHash = computeHash(fileContent);
        
        if (processedHashes.has(fileHash)) {            
            console.log(`Skipping duplicate file: ${file.name}`);
            continue;
        }

        processedHashes.add(fileHash);

        const tokenCount = await countTokens(fileContent);

        // if (tokenCount > maxTokenLimit) {
        //     const texts = splitTextByTokens(fileContent);

        //     console.log(texts);  // Check if texts is now an array of text chunks

        //     for (let text of texts) {
        //         let embeddedTextForFile = await processFile(text);
        //         embedded.push({ name: file.name, embeddedText: embeddedTextForFile, content: file.content });
        //     }
        // } else {
        //     let embeddedTextForFile = await processFile(fileContent);
        //     embedded.push({
        //         name: file.name,
        //         embeddedText: embeddedTextForFile,
        //         content: file.content,
        //     });
        // }

        if (tokenCount > maxTokenLimit) {
            // Await the result of splitTextByTokens to get the resolved array
            const texts = await splitTextByTokens(fileContent);
        
            for (let text of texts) {
                let embeddedTextForFile = await processFile(text);
                embedded.push({ name: file.name, embeddedText: embeddedTextForFile, content: file.content });
            }
        } else {
            let embeddedTextForFile = await processFile(fileContent);
            embedded.push({
                name: file.name,
                embeddedText: embeddedTextForFile,
                content: file.content,
            });
        }
    }

    res.status(200).json({ message: "success", embedded });
});

// app.post("/huggingfaceEmbedding", async (req, res) => {

//     async function generateEmbedding(text) {
//         const response = await hf.featureExtraction({
//             model: "sentence-transformers/all-MiniLM-L12-v2",  // A popular lightweight model
//             inputs: text,
//         });
//         return response;
//     }

//     generateEmbedding("Hello, world!").then(console.log);

//     //Online REST API
//     // async function generateEmbedding(text) {
//     //     const response = await axios.post(
//     //         'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2',
//     //         { inputs: text },
//     //         {
//     //             headers: { Authorization: `Bearer your-huggingface-api-key` }
//     //         }
//     //     );
//     //     return response.data;
//     // }

//     // generateEmbedding("Hello, world!").then(console.log).catch(console.error); 

// });

//Groq ai endpoints

app.post("/groqChat", async (req, res) => {
 
    const cosineSimilarity = (vecA, vecB) => {
        // if (!vecA || !vecB || vecA.length !== vecB.length) {
        //     console.error('Invalid embeddings:', vecA, vecB);
        //     return -1;
        //     // throw new Error('Embedding vectors are either null or have mismatched lengths.');
        // }
    
        // const dotProduct = vecA.reduce((sum, value, index) => sum + value * vecB[index], 0);
        // const magnitudeA = Math.sqrt(vecA.reduce((sum, value) => sum + value * value, 0));
        // const magnitudeB = Math.sqrt(vecB.reduce((sum, value) => sum + value * value, 0));
        // return dotProduct / (magnitudeA * magnitudeB);


        if (!Array.isArray(vecA) || !Array.isArray(vecB)) {
            console.error("Invalid vectors for cosineSimilarity:", vecA, vecB);
            return -1;
        }
        const dotProduct = vecA.reduce((sum, value, index) => sum + value * vecB[index], 0);
        const magnitudeA = Math.sqrt(vecA.reduce((sum, value) => sum + value * value, 0));
        const magnitudeB = Math.sqrt(vecB.reduce((sum, value) => sum + value * value, 0));
        return magnitudeA && magnitudeB ? dotProduct / (magnitudeA * magnitudeB) : 0;


    };

    const searchEmbeddings = (queryEmbedding, storedEmbeddings) => {     
        const results = storedEmbeddings.map((embedding, index) => {            
            const similarity = cosineSimilarity(queryEmbedding, embedding);              
            return { index, similarity };
        });
        
        results.sort((a, b) => b.similarity - a.similarity);
        return results.slice(0, 10); // Top N results
    };

    async function getGroqChatCompletion(question, storedEmbeddings, originalTexts, conversation, model, temperature, maxTokens) {
        const tokenizer = await AutoTokenizer.from_pretrained('sentence-transformers/bert-base-nli-mean-tokens');

    //     let queryResponse = "";
    //     try {
    //         queryResponse = await hf.featureExtraction({
    //             model: "sentence-transformers/all-mpnet-base-v2",
    //             inputs: "Hello world",
    //         });
    //         console.log(queryResponse);
    //     } catch (err) {
    //         console.error("HF API Error:", err.message);
    //     }

    //    // Step 1: Get the embedding for the user's question
    //     const queryEmbedding = queryResponse;

        let queryResponse = null;
        try {
            queryResponse = await hf.featureExtraction({
                model: "sentence-transformers/all-mpnet-base-v2",
                inputs: question,
            });
        } catch (err) {
            console.error("HF API Error:", err.message);
        }

        const queryEmbedding = queryResponse || [0]; // some models wrap in extra array
        
        // Step 2: Retrieve similar results based on the embeddings
        const similarResults = searchEmbeddings(queryEmbedding, storedEmbeddings);

        // Step 3: Get the relevant texts from your data source
        const relevantTexts = similarResults.map(result => originalTexts[result.index]);

        //Limit the number of relevant texts sent
        //The way you’re constructing the message with relevantTexts can cause the message size to grow rapidly. 
        // Instead of sending all the relevant texts at once, you can limit the number of texts or shorten the content being sent.

        // Step 3: Process the relevant texts while respecting the token limit

        // Call the function to shorten text
        // Function to encode, truncate, and decode while preserving original token count
        async function shortenRelevantTexts(relevantTexts, tokenizer, maxTokenLimit = 4000) {

            return relevantTexts.map((text) => {
                const token_ids = tokenizer.encode(text); // Tokenize the input

                if (!token_ids || token_ids.length === 0) {
                throw new Error("Token IDs array is empty."); // Handle the error
                }

                // Shorten the tokens if necessary
                if (token_ids.length > maxTokenLimit) {                    
                    return tokenizer.decode(token_ids.slice(0, maxTokenLimit));
                }
                
                return text;
            });
        }
        const shortenedRelevantText = await shortenRelevantTexts(relevantTexts, tokenizer, 4500);

        async function shortenConversation(conversation, tokenizer, maxTokenLimit) {
            let totalTokens = 0;
            
            // Calculate tokens for the entire conversation
            const tokenizedConversation = conversation.map((message) => {
                const tokenIds = tokenizer.encode(message.content);
                totalTokens += tokenIds.length;
                return { ...message, tokenIds };
            });
            
            // Shorten the content if necessary
            if (totalTokens > maxTokenLimit) {
                console.log("Conversation exceeds max token limit. Shortening content...");
            
                // Sort by role to prioritize keeping user messages intact
                const prioritizedMessages = tokenizedConversation.sort((a, b) => {
                    if (a.role === 'user' && b.role === 'system') return -1;
                    if (a.role === 'system' && b.role === 'user') return 1;
                    return 0;
                });
            
                let shortenedTokens = 0;
                for (let message of prioritizedMessages) {
                    if (shortenedTokens + message.tokenIds.length > maxTokenLimit) {
                        // Shorten the content of this message
                        const remainingTokens = maxTokenLimit - shortenedTokens;
                        if (remainingTokens <= 0) {
                            message.content = ""; // If no tokens are left, remove content
                        } else {
                            const shortenedContent = tokenizer.decode(message.tokenIds.slice(0, remainingTokens));
                            message.content = shortenedContent;
                        }
                    }
                    
                    shortenedTokens += message.tokenIds.length;
                }
            }
            
            // Return the shortened conversation
            return tokenizedConversation.map(({ tokenIds, ...message }) => message);
        }

        let convertedConversation = conversation.reverse();

        let previousConversation = await shortenConversation(convertedConversation, tokenizer, 250);

        previousConversation.push(
            { role: "system", content: "Du är en assistent som svarar på frågor baserat på följande kontext." },
            {
                role: "user",
                content: `Här är några relevanta texter:\n- ${shortenedRelevantText}\nAnvänd dessa texter för att svara på frågan nedan.`
            },
        )

        let conversationsToAI = previousConversation.reverse();

        // Tokenize and check the question
        const tokenizedQuestion = tokenizer.encode(question);
        if (tokenizedQuestion.length > 250) {
            return "The message you entered is too long, please clear the conversation and submit something shorter." ; // Ensure no further execution
        }

        conversationsToAI.push({ role: "user", content: question });
        
        let completionResponse = await groq.chat.completions.create({
            messages: conversationsToAI,
            model: model ? model : ollamaModel,
            temperature: temperature ? temperature : 0.5,
            max_tokens: maxTokens ? maxTokens : 1024,
        });
        
        return completionResponse.choices[0].message.content;
    }

    let answer = await getGroqChatCompletion(req.body.question, req.body.storedEmbeddings, req.body.originalTexts, req.body.conversation, req.body.model, req.body.temperature, req.body.maxTokens);

    answer && questionsAsked.push(req.body.question);
    console.log(questionsAsked);
    
    res.status(200).json({ message: "success" , answer});
});
app.post('/getTextSnippGroq', async (req, res) => {

    const handleFindingText = async(model, textToLocate, allText) => {

        return groq.chat.completions.create({
            messages: [
                { role: "system", content: "You are a text locater. I will provide you a text and i want you to find where that text can be taken from. Answer me only with the sentences or phragraph that you located the text in!" },
                {
                    role: "user",
                    content: `Here is the text the whole text i want you to search through:\n- ${allText}\n Use this texts to locate the text down below.`
                },
                { role: "user", content: `Here is the text i want you to locate: ${textToLocate}` }
            ],
            model: model ? model : ollamaModel,
            temperature:0.2
        });
    }

    let response = await handleFindingText(req.body.model, req.body.textToLocate, req.body.allText);

    res.status(200).json({ message: "success" , textSnipp: response.choices[0].message.content});
});

app.get("/questionsAsked", (req, res) => {
    const { authorization } = req.headers;

    if(authorization && authorization === "gandalf"){
        // res.json({"conversations": conversations});
        res.send(questionsAsked);
    }
});


//Zello Systems
let zelloSystemContentGroq = {
    name: "Zello Systems - snabba svar, smartare beslut.pdf",
    embeddedText: [
        [
            -0.0957997664809227,
            0.01726762019097805,
            0.021601200103759766,
            -0.01196565106511116,
            -0.04577364772558212,
            -0.031040247529745102,
            -0.035173431038856506,
            0.005064582452178001,
            0.014222870580852032,
            0.09771721810102463,
            -0.044088851660490036,
            0.009072198532521725,
            0.0063023376278579235,
            0.04115144908428192,
            0.01744016818702221,
            -0.021450839936733246,
            -0.030311595648527145,
            0.026874974370002747,
            -0.03806943818926811,
            0.0400518998503685,
            -0.049696873873472214,
            -0.02344953455030918,
            0.019059767946600914,
            0.07884479314088821,
            0.0030024107545614243,
            -0.012746739201247692,
            0.029625967144966125,
            -0.01806608960032463,
            0.08765004575252533,
            -0.032402411103248596,
            0.027852581813931465,
            0.022840626537799835,
            0.06362241506576538,
            -0.030688855797052383,
            -0.03155583143234253,
            -0.05731653794646263,
            0.0011997423134744167,
            -0.04445425420999527,
            0.015785738825798035,
            -0.001016103196889162,
            0.002171448664739728,
            -0.08563905954360962,
            -0.05820881947875023,
            0.039154574275016785,
            -0.09145859628915787,
            0.005688036326318979,
            -0.08804380148649216,
            -0.016829486936330795,
            -0.039024099707603455,
            -0.05195099860429764,
            -0.12254627794027328,
            -0.08346669375896454,
            0.02525188960134983,
            -0.009610498324036598,
            -0.0429532416164875,
            -0.0007996676140464842,
            0.06424538046121597,
            0.09964336454868317,
            -0.0838124230504036,
            -0.04110351949930191,
            0.04984794929623604,
            -0.037057116627693176,
            -0.026210589334368706,
            0.01319409254938364,
            0.0029710601083934307,
            0.01024186983704567,
            -0.06277879327535629,
            0.05024596303701401,
            -0.05129711329936981,
            -0.02623853087425232,
            -0.0825396478176117,
            -0.029738876968622208,
            0.040245670825242996,
            0.08550024777650833,
            0.017983663827180862,
            0.015232114121317863,
            0.06141587346792221,
            0.01670122891664505,
            -0.03236616775393486,
            -0.04318275675177574,
            0.08151601999998093,
            -0.0266678836196661,
            -0.034437425434589386,
            0.010173906572163105,
            0.007301708683371544,
            0.05393986776471138,
            -0.05180145055055618,
            -0.04351586848497391,
            0.11329614371061325,
            -0.05583305284380913,
            0.005780564621090889,
            0.08466285467147827,
            0.03644393011927605,
            0.016864173114299774,
            -0.02968994528055191,
            0.013764350675046444,
            0.014985261484980583,
            -0.09150916337966919,
            -0.026184910908341408,
            0.07122784107923508,
            0.09702913463115692,
            -0.011251176707446575,
            0.11112955957651138,
            -0.07835538685321808,
            0.10147616267204285,
            0.011640695855021477,
            -0.03805765509605408,
            -0.06038014590740204,
            0.055248357355594635,
            0.05345740169286728,
            -0.03498655557632446,
            -0.0027932296507060528,
            -0.01996898092329502,
            -0.028766997158527374,
            0.0330023355782032,
            0.039390794932842255,
            0.030253661796450615,
            0.03769596666097641,
            0.0015069993678480387,
            -0.056825798004865646,
            -0.05755382403731346,
            -0.03658681735396385,
            0.011017244309186935,
            -0.02342376485466957,
            0.12701502442359924,
            -0.022682901471853256,
            -0.011657411232590675,
            -0.0073898653499782085,
            -0.08685549348592758,
            -0.007322853431105614,
            -0.07186310738325119,
            -0.005735096987336874,
            -0.06181686371564865,
            -0.05457025393843651,
            0.0010047557298094034,
            0.011506485752761364,
            0.025029119104146957,
            0.0035660744179040194,
            -0.016499588266015053,
            -0.10446438193321228,
            0.058295853435993195,
            0.013612976297736168,
            0.05872557312250137,
            0.05587976798415184,
            0.05550815910100937,
            -0.050060395151376724,
            -0.05785664543509483,
            -0.03704371303319931,
            0.021270252764225006,
            -0.07384747266769409,
            0.04932468757033348,
            0.01780785620212555,
            0.12293820828199387,
            0.018407102674245834,
            0.0028925579972565174,
            0.0646311491727829,
            -0.028436580672860146,
            0.03273646906018257,
            0.03223617374897003,
            0.06784730404615402,
            0.0006010709912516177,
            0.04485659301280975,
            0.007809482980519533,
            -0.014987795613706112,
            0.08125860244035721,
            -0.05957317724823952,
            0.0014756987802684307,
            0.001128927106037736,
            -0.006716177798807621,
            -0.03131601959466934,
            0.040167976170778275,
            0.009737554006278515,
            0.03041667491197586,
            0.028719862923026085,
            0.013207891955971718,
            -0.05803827941417694,
            -0.024398788809776306,
            -0.042546194046735764,
            -0.12413957715034485,
            -0.04733182117342949,
            0.0033066440373659134,
            0.054050955921411514,
            -0.09702096879482269,
            0.022558268159627914,
            0.053191397339105606,
            0.049332451075315475,
            -0.016751131042838097,
            -0.021592143923044205,
            -0.12319891154766083,
            -0.06264685094356537,
            -0.0007485809619538486,
            -0.029187465086579323,
            0.024370338767766953,
            0.007121685426682234,
            -0.004780952353030443,
            -0.031058359891176224,
            0.0027361002285033464,
            -0.06225956603884697,
            0.03765356168150902,
            0.028827108442783356,
            -0.1133764386177063,
            0.08980503678321838,
            0.012528475373983383,
            0.056685786694288254,
            -0.06062260642647743,
            -0.08723403513431549,
            -0.04593607783317566,
            -0.02834632806479931,
            0.05658897012472153,
            0.0026767165400087833,
            -0.016874201595783234,
            0.04166243597865105,
            0.09268529713153839,
            -0.06402065604925156,
            0.05834401026368141,
            -0.035159893333911896,
            -0.054761119186878204,
            0.05718730762600899,
            -0.12400557845830917,
            -0.0016638997476547956,
            0.10967439413070679,
            0.028021320700645447,
            0.00507381884381175,
            -1.5561898043427997e-32,
            0.0020550410263240337,
            0.054788608103990555,
            0.040398746728897095,
            0.06190113350749016,
            0.02287462167441845,
            0.04500436410307884,
            -0.07862690091133118,
            -0.015843670815229416,
            0.04643655940890312,
            0.014771890826523304,
            -0.04480798542499542,
            -0.07419736683368683,
            0.08735767751932144,
            0.016872523352503777,
            -0.02251267246901989,
            0.0023460558149963617,
            0.034622304141521454,
            -0.050359081476926804,
            0.043030135333538055,
            -0.0193365216255188,
            0.00305170682258904,
            0.00512578384950757,
            -0.021357601508498192,
            0.026086997240781784,
            -0.011949372477829456,
            0.040383581072092056,
            -0.06740553677082062,
            -0.04920639097690582,
            -0.039096422493457794,
            0.014415021054446697,
            -0.10659851133823395,
            -0.05824177712202072,
            -0.009151039645075798,
            0.019435033202171326,
            -0.009440096095204353,
            -0.020567022264003754,
            0.06948837637901306,
            -0.05047471448779106,
            -0.10187187045812607,
            -0.04356035217642784,
            0.10763698816299438,
            0.03947780653834343,
            -0.10779646784067154,
            0.008298637345433235,
            -0.008785034529864788,
            -0.0965011790394783,
            0.049146618694067,
            0.046874869614839554,
            -0.134754478931427,
            -0.005942591466009617,
            0.0750056579709053,
            -0.06945841759443283,
            0.0003014772664755583,
            -0.0575287751853466,
            0.04238408803939819,
            0.01432046014815569,
            0.008628676645457745,
            -0.03251752629876137,
            0.0302226934581995,
            -0.04175162315368652,
            0.10300704836845398,
            -0.04839552193880081,
            -0.036097072064876556,
            -0.06350010633468628,
            0.08307714015245438,
            0.03550370782613754,
            0.04343079775571823,
            -0.0034713270142674446,
            0.019207268953323364,
            -0.07404334098100662,
            0.025641804561018944,
            -0.005889191757887602,
            -0.007212696131318808,
            0.028778189793229103,
            -0.05722213163971901,
            0.01916346326470375,
            -0.05354515090584755,
            0.0077651627361774445,
            -0.008170291781425476,
            -0.13033269345760345,
            0.00018695600738283247,
            -0.034857526421546936,
            -0.003662822302430868,
            -0.029163362458348274,
            -0.005827003624290228,
            -0.07108303904533386,
            0.0017239612061530352,
            -0.0525502972304821,
            -0.05356552451848984,
            0.025461571291089058,
            0.06254076957702637,
            -0.0014806146500632167,
            0.05413025990128517,
            0.11516565084457397,
            0.009628841653466225,
            1.30359184936275e-31,
            0.002895014826208353,
            -0.03161009028553963,
            -0.0667281448841095,
            0.021202892065048218,
            0.05013537034392357,
            -0.004557023756206036,
            -0.03842531889677048,
            -0.029114684090018272,
            -0.06356687098741531,
            -0.02350991778075695,
            0.027812859043478966,
            0.015243091620504856,
            0.03249270096421242,
            0.10067526251077652,
            -0.03642214462161064,
            0.03144053742289543,
            -0.03502011299133301,
            0.06596093624830246,
            -0.03374304249882698,
            -0.045399267226457596,
            0.0280649084597826,
            0.04338601976633072,
            -0.09580794721841812,
            0.021080968901515007,
            0.022587943822145462,
            -0.050534412264823914,
            -0.08605316281318665,
            -0.013173782266676426,
            0.12837758660316467,
            -0.0722755715250969,
            -0.04522679001092911,
            0.008178746327757835,
            0.04595691338181496,
            -0.08673342317342758,
            -0.047471918165683746,
            -0.015276170335710049,
            0.021048514172434807,
            -0.017300888895988464,
            0.014167584478855133,
            0.00007715768151683733,
            0.05939245969057083,
            -0.04812043160200119,
            -0.009088849648833275,
            -0.014430707320570946,
            -0.0673936977982521,
            -0.03017272986471653,
            -0.02325334958732128,
            0.010698512196540833,
            -0.01531374454498291,
            -0.010687652975320816,
            -0.06870972365140915,
            -0.03570719063282013,
            0.03898925706744194,
            0.040504224598407745,
            -0.025408104062080383,
            0.020029747858643532,
            0.02602359466254711,
            -0.020344095304608345,
            -0.050780341029167175,
            0.06075936555862427,
            0.10773767530918121,
            -0.045118190348148346,
            -0.01941373571753502,
            -0.07021571695804596
          ]
      ],
    content: [
        'Zello   Systems -   snabba   svar,   smartare   beslut  Kontakta   oss   idag.   Tillsammans   skapar   vi   en   klokare   och   bättre   värld   med   hjälp   av   AI.  Om  Ledande   inom   AI   och   smarta   lösningar  På   Zello   Systems   förenar   vi   avancerad   AI-teknik   med   enkelhet   och   effektivitet.   Vi   gör   komplexa  uppgifter   hanterbara   och   ger   organisationer   verktyg   för   att   fatta   snabbare   och   bättre   beslut.   Vi   tror   på  teknik   som   skapar   möjligheter,   inte   bara   lösningar.   [Zello   Systems   är   en   del   av   Aistrateg   Malmö   AB]  Tjänster  Zellos   Systems   optimerar   er   verksamhet  ZelloHR™:   En   AI-driven   assistent   som   gör   HR-arbetet   enklare   och   mer   effektivt.   Den   svarar   på   frågor,  hanterar   dokument   och   ger   er   tillgång   till   rätt   information   direkt.  ZelloKundtjänst™:   En   AI-driven   assistent   som   ger   er   kundtjänst   tillgänglighet   dygnet   runt.   Den  levererar   snabba   svar,   löser   frågor   smidigt   och   skapar   en   förstklassig   kundupplevelse.  ZelloProtokoll™:   En   AI-driven   assistent   som   gör   protokollhantering   snabbare   och   enklare.   Den   hjälper   er  att   söka,   sammanfatta   och   hitta   rätt   information   direkt   –   allt   för   att   spara   tid   och   öka   precisionen.  ZelloFlex™:   En   AI-driven   lösning   som   utformas   efter   era   specifika   behov.   Den   anpassas   för   att   möta   era  krav   och   skapa   exakt   det   stöd   er   verksamhet   behöver.  Varför   välja   oss?  Vi   hjälper   er   att   lyckas  Anpassade   AI-lösningar:   Vi   utvecklar   mjukvara   som   är   utformad   för   att   fungera   smidigt   i   just   er  verksamhet.   Våra   produkter   bygger   på   en   djup   förståelse   för   er   organisation   och   de   utmaningar   ni   möter.  Expertis   inom   artificiell   intelligens:   Vårt   team   av   experter   är   väl   insatta   i   den   senaste   tekniken   och   vet  hur   man   omsätter   den   till   praktiska   och   effektiva   lösningar   som   gör   skillnad   för   er.  Er   framång   är   vårt   fokus:   Vi   arbetar   nära   er   för   att   skapa   verkligt   värde.   Vår   uppgift   är   att   förstå   era   mål  och   säkerställa   att   varje   steg   vi   tar   tillsammans   leder   till   konkreta   förbättringar.  Projekt  Exempel   på   pågående   projekt  HR-assistenten   Bärta   för   Bjuvs   kommun:   För   Bjuvs   kommun   har   vi   utvecklat   Bärta,   en   AI-driven  HR-assistent   som   besvarar   personalfrågor,   guidar   genom   lagar   och   avtal   och   ger   snabba   svar   direkt   från  HR-dokument.   Bärta   frigör   tid   och   gör   HR-arbetet   mer   effektivt   och   tillgängligt.\n' +
          'Kundtjänst-assistenten   för   Sjöbo   kommun:   För   Samhällsbyggnadsförvaltningen   i   Sjöbo   har   vi   utvecklat  en   AI-driven   kundtjänstassistent   [prototyp]   som   hanterar   medborgarfrågor   dygnet   runt.   Assistenten   ger  snabba   och   korrekta   svar   direkt   från   relevanta   dokument   och   riktlinjer,   vilket   effektiviserar  kommunikationen   och   ökar   tillgängligheten.  Offert-AI   för   Jobsab:   För   Jobsab   har   vi   skapat   en   AI-driven   lösning   som   automatiserar   offertprocessen.  Offert-AI   genererar   korrekta   och   detaljerade   offerter   snabbt,   baserat   på   kundens   behov   och   projektets   krav,  vilket   sparar   tid   och   förbättrar   precisionen.  Fastighetsassistent   för   Sveriges   Allmännytta:   För   tre   företag   inom   Sveriges   Allmännytta   utvecklar   vi   en  prototyp   av   en   AI-driven   assistent   kopplad   till   deras   fastighetssystem.   Assistenten   effektiviserar  arbetsflöden   genom   att   snabbt   ge   svar   och   tillgång   till   relevant   information   direkt   från   systemet.  Omdömen  Bjuvs   kommun   visar   vägen  Sara   Jönsson;   HR-chef:   Med   HR-assistenten   Bärta   från   Zello   Systems   har   vi   tagit   ett   stort   kliv   framåt.  Bärta   hjälper   oss   att   effektivisera   HR-arbetet   och   förbättra   stödet   till   våra   medarbetare   –   en   lösning   där  Bjuvs   kommun   verkligen   visar   vägen.  Vår   berättelse  Allt   började   med   idén   om...  “...att   göra   avancerad   teknologi   tillgänglig   och   mänsklig.”  Vi   på   Aistrateg   Malmö   AB   såg   AI:s   potential   att   förändra   arbetssätt,   men   visionen   var   att   skapa   något  kraftfullt,   vackert   och   harmoniskt.   Därifrån   föddes   Zello,   inspirerat   av   Cello,   ett   instrument   som  symboliserar   harmoni   och   precision.   På   samma   sätt   är   ambitionen   att   AI-lösningar   ska   bidra   med   enkelhet,  balans   och   styrka   i   det   dagliga   arbetet.  Zello   Systems   hjälper   organisationer   och   team   att   möta   framtidens   utmaningar   –   från   att   effektivisera  HR-processer   till   att   underlätta   protokollhantering.   Zello   integreras   smidigt   i   arbetsflöden   och   skapar   nya  möjligheter,   alltid   redo   att   anpassas   efter   behoven.   Med   Zello   Systems   erbjuds   en   lösning   som   förenklar,  förbättrar   och   gör   varje   interaktion   meningsfull   –   en   partner   som   driver   utveckling   med   både   precision   och  enkelhet.  Kontakt  Kontakta   oss   direkt   för   personlig   service.  Vi   finns   här   för   att   hjälpa   er   med   alla   frågor   och   behov.  Zello   Systems;   Genetor   Malmö   K6;   ,   Kungsgatan   6,   211   49   Malmö  +46   733   188885  info@zellosystems.se\n'
      ]
}

app.post("/zellosystemsopenai", async (req, res) => {

    const cosineSimilarity = (vecA, vecB) => {
        if (!vecA || !vecB || vecA.length !== vecB.length) {
            console.error('Invalid embeddings:', vecA, vecB);
            throw new Error('Embedding vectors are either null or have mismatched lengths.');
        }
    
        const dotProduct = vecA.reduce((sum, value, index) => sum + value * vecB[index], 0);
        const magnitudeA = Math.sqrt(vecA.reduce((sum, value) => sum + value * value, 0));
        const magnitudeB = Math.sqrt(vecB.reduce((sum, value) => sum + value * value, 0));
        return dotProduct / (magnitudeA * magnitudeB);
    };

    const searchEmbeddings = (queryEmbedding, storedEmbeddings) => {        
        const results = storedEmbeddings.map((embedding, index) => {
            const similarity = cosineSimilarity(queryEmbedding, embedding);            
            return { index, similarity };
        });
        
        results.sort((a, b) => b.similarity - a.similarity);
        return results.slice(0, 10); // Top N results
    };

    const handleSearch = async (question, storedEmbeddings, originalTexts, conversation) => {
        const queryResponse = await openai.embeddings.create({
            input: question,
        });
        
       // Step 1: Get the embedding for the user's question
        const queryEmbedding = queryResponse.data[0].embedding;

        // Step 2: Retrieve similar results based on the embeddings
        const similarResults = searchEmbeddings(queryEmbedding, storedEmbeddings);

        // Step 3: Get the relevant texts from your data source
        const relevantTexts = similarResults.map(result => originalTexts[result.index]);

        let previousConversation = conversation.reverse();

        previousConversation.push(
            { 
                role: "system", 
                content: "You are an assistant specifically built to help users who ask questions about Zello Systems, answering based on the following context." 
            },
            {
                role: "user",
                content: `Here are some relevant texts:\n- ${relevantTexts.join('\n- ')}\nUse these texts to answer the question below.`
            },
        )

        let conversationsToAI = previousConversation.reverse();

        conversationsToAI.push({ role: "user", content: `Here is my question: ${question}` });

        // Step 4: Create the OpenAI API request
        const completionResponse = await openai.chat.completions.create({
            model: latestAIModel,
            messages: conversationsToAI,
            temperature: 0
        });
 
        // console.log(completionResponse.choices[0].message.content);
        return completionResponse.choices[0].message.content;
    };
    
    // Example search
    let answer = await handleSearch(req.body.question, req.body.storedEmbeddings, req.body.originalTexts, req.body.conversation);

    res.status(200).json({ message: "success" , answer});
});


app.post("/groqChatZelloSystems", async (req, res) => {
    // console.log(req.body.storedEmbeddings);
    // console.log(req.body.originalTexts);
    

    const cosineSimilarity = (vecA, vecB) => {
        if (!vecA || !vecB || vecA.length !== vecB.length) {
            console.error('Invalid embeddings:', vecA, vecB);
            // throw new Error('Embedding vectors are either null or have mismatched lengths.');
        }
    
        const dotProduct = vecA.reduce((sum, value, index) => sum + value * vecB[index], 0);
        const magnitudeA = Math.sqrt(vecA.reduce((sum, value) => sum + value * value, 0));
        const magnitudeB = Math.sqrt(vecB.reduce((sum, value) => sum + value * value, 0));
        return dotProduct / (magnitudeA * magnitudeB);
    };

    const searchEmbeddings = (queryEmbedding, storedEmbeddings) => {     
        const results = storedEmbeddings.map((embedding, index) => {            
            const similarity = cosineSimilarity(queryEmbedding, embedding);              
            return { index, similarity };
        });
        
        results.sort((a, b) => b.similarity - a.similarity);
        return results.slice(0, 10); // Top N results
    };

    async function getGroqChatCompletion(question, storedEmbeddings, originalTexts, conversation, model, temperature, maxTokens) {
        const tokenizer = await AutoTokenizer.from_pretrained('sentence-transformers/bert-base-nli-mean-tokens');

        const queryResponse =  await hf.featureExtraction({
            model: "sentence-transformers/all-MiniLM-L6-v2",  // A popular lightweight model
            inputs: question,
        });
            
       // Step 1: Get the embedding for the user's question
        const queryEmbedding = queryResponse;
        
        // Step 2: Retrieve similar results based on the embeddings
        const similarResults = searchEmbeddings(queryEmbedding, storedEmbeddings);

        // Step 3: Get the relevant texts from your data source
        const relevantTexts = similarResults.map(result => originalTexts[result.index]);

        //Limit the number of relevant texts sent
        //The way you’re constructing the message with relevantTexts can cause the message size to grow rapidly. 
        // Instead of sending all the relevant texts at once, you can limit the number of texts or shorten the content being sent.

        // Step 3: Process the relevant texts while respecting the token limit

        // Call the function to shorten text
        // Function to encode, truncate, and decode while preserving original token count
        async function shortenRelevantTexts(relevantTexts, tokenizer, maxTokenLimit = 4000) {

            return relevantTexts.map((text) => {
                const token_ids = tokenizer.encode(text); // Tokenize the input

                if (!token_ids || token_ids.length === 0) {
                throw new Error("Token IDs array is empty."); // Handle the error
                }

                // Shorten the tokens if necessary
                if (token_ids.length > maxTokenLimit) {                    
                    return tokenizer.decode(token_ids.slice(0, maxTokenLimit));
                }
                
                return text;
            });
        }
        const shortenedRelevantText = await shortenRelevantTexts(relevantTexts, tokenizer, 4500);

        async function shortenConversation(conversation, tokenizer, maxTokenLimit) {
            let totalTokens = 0;
            
            // Calculate tokens for the entire conversation
            const tokenizedConversation = conversation.map((message) => {
                const tokenIds = tokenizer.encode(message.content);
                totalTokens += tokenIds.length;
                return { ...message, tokenIds };
            });
            
            // Shorten the content if necessary
            if (totalTokens > maxTokenLimit) {
                console.log("Conversation exceeds max token limit. Shortening content...");
            
                // Sort by role to prioritize keeping user messages intact
                const prioritizedMessages = tokenizedConversation.sort((a, b) => {
                    if (a.role === 'user' && b.role === 'system') return -1;
                    if (a.role === 'system' && b.role === 'user') return 1;
                    return 0;
                });
            
                let shortenedTokens = 0;
                for (let message of prioritizedMessages) {
                    if (shortenedTokens + message.tokenIds.length > maxTokenLimit) {
                        // Shorten the content of this message
                        const remainingTokens = maxTokenLimit - shortenedTokens;
                        if (remainingTokens <= 0) {
                            message.content = ""; // If no tokens are left, remove content
                        } else {
                            const shortenedContent = tokenizer.decode(message.tokenIds.slice(0, remainingTokens));
                            message.content = shortenedContent;
                        }
                    }
                    
                    shortenedTokens += message.tokenIds.length;
                }
            }
            
            // Return the shortened conversation
            return tokenizedConversation.map(({ tokenIds, ...message }) => message);
        }

        let convertedConversation = conversation.reverse();

        let previousConversation = await shortenConversation(convertedConversation, tokenizer, 250);

        previousConversation.push(
            {
                "role": "system",
                "content": "Du är en assistent specifikt skapad för att hjälpa användare som ställer frågor om Zello Systems och svarar baserat på följande kontext."
            },
            {
                "role": "user",
                "content": `Här är några relevanta texter:\n- ${relevantTexts.join('\n- ')}\nAnvänd dessa texter för att besvara frågan nedan.`
            }
        )

        let conversationsToAI = previousConversation.reverse();

        // Tokenize and check the question
        const tokenizedQuestion = tokenizer.encode(question);
        if (tokenizedQuestion.length > 250) {
            return "The message you entered is too long, please clear the conversation and submit something shorter." ; // Ensure no further execution
        }

        conversationsToAI.push({ role: "user", content: question });
        
        let completionResponse = await groq.chat.completions.create({
            messages: conversationsToAI,
            model: model ? model : ollamaModel,
            temperature: temperature ? temperature : 0.5,
            max_tokens: maxTokens ? maxTokens : 1024,
        });
        
        return completionResponse.choices[0].message.content;
    }

    let answer = await getGroqChatCompletion(req.body.question, zelloSystemContentGroq.embeddedText, zelloSystemContentGroq.content, req.body.conversation, req.body.model, req.body.temperature, req.body.maxTokens);

    // answer && questionsAsked.push(req.body.question);
    // console.log(questionsAsked);
    
    res.status(200).json({ message: "success" , answer});
});

app.listen(port, () => {
    console.log(port);
    // startPingingServer();
})



// const allproducts = JSON.parse(fs.readFileSync("./products.json", "utf-8"));
// const results = JSON.parse(fs.readFileSync("./results.json", "utf-8"));

function recreateProductsJsonWithNamesAndDescription() {    
    const allproducts = JSON.parse(fs.readFileSync("./products.json", "utf-8"));
    const results = JSON.parse(fs.readFileSync("./results.json", "utf-8"));
    let newProducts = results.map((product, idx) => {
        if (results[idx].name ) {
            
        }
        return {
            ...product,
            price: allproducts[idx].Price,
            cost: allproducts[idx].Cost,
            group: allproducts[idx].Group,
            originalName: allproducts[idx].Name
        }
    })
    
    fs.writeFileSync("./finalVersion.json", JSON.stringify(newProducts, null, 2), "utf-8");
}

async function divideDescriptionFromName() {

const allproducts = JSON.parse(fs.readFileSync("./products.json", "utf-8"));

  try {
    // Map only Name to send to AI
    const productsForAI = allproducts.map(p => ({ Name: p.Name }));

    const messages = [
      {
        role: "system",
        content: `
        You are an assistant that processes an array of products.  
        For each product:
        - Look at the "Name" field.  
        - Split it into two parts:  
        - "Name": the actual product name (this may be only the first word or the first two words or maybe even first three words, depending on what makes sense).  
        - "Description": everything else that follows after the product name.  
        - Return the result as a valid JSON array of objects with "Name" and "Description" only.
        `,
      },
      {
        role: "user",
        content: `Here is the products array:\n${JSON.stringify(productsForAI)}`,
      },
    ];

    const completionResponse = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages,
      temperature: 0,
    });

    const aiMessage = completionResponse.choices[0].message?.content;

    let dividedNames;
    try {
      dividedNames = JSON.parse(aiMessage || "[]");
    } catch (err) {
      console.error("AI response was not valid JSON:", aiMessage);
      return;
    }

    // Merge AI output with original product data
    const finalProducts = allproducts.map((original, idx) => {
      const aiResult = dividedNames[idx] || {};
      return {
        ...original,
        Name: aiResult.Name || original.Name,
        Description: aiResult.Description || "",
      };
    });

    // Save to file
    fs.writeFileSync(
      "./dividedProducts.json",
      JSON.stringify(finalProducts, null, 2),
      "utf-8"
    );

    console.log("Products successfully divided and saved to dividedProducts.json");
  } catch (error) {
    console.error("Error dividing product names:", error);
  }    
}

// divideDescriptionFromName();