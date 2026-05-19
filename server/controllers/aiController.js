import OpenAI from "openai";
import fs from 'fs'
import pdf from 'pdf-parse/lib/pdf-parse.js'


import axios from "axios";
import sql from "../configs/db.js";
import { clerkClient } from "@clerk/express";
// import {v2 as cloudinary} from "cloudinary";
import cloudinary from "../configs/cloudinary.js";
const AI = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
});

export const generateArticle = async (req, res) => {

    try {

        const { userId } = req.auth();

        const { prompt, length } = req.body;

        const plan = req.plan;
        const free_usage = req.free_usage;

        if (plan !== 'premium' && free_usage >= 10) {

            return res.json({
                success: false,
                message: "Limit reached. Upgrade to continue."
            });

        }

        const response = await AI.chat.completions.create({
            model: "openai/gpt-3.5-turbo",
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
        });

        const content = response.choices[0].message.content;

        await sql`
        INSERT INTO creations(user_id,prompt,content,type)
        VALUES(${userId},${prompt},${content},'article')
        `;

        if (plan !== 'premium') {

            await clerkClient.users.updateUserMetadata(userId, {
                privateMetadata: {
                    free_usage: free_usage + 1
                }
            });

        }

        res.json({
            success: true,
            content
        });

    } catch (error) {

        console.log(error);

        res.json({
            success: false,
            message: error.message
        });

    }

}


// export const generateBlogTitle = async (req, res) => {

//     try {

//         const { userId } = req.auth();

//         const { prompt } = req.body;

//         const plan = req.plan;
//         const free_usage = req.free_usage;

//         if (plan !== 'premium' && free_usage >= 10) {

//             return res.json({
//                 success: false,
//                 message: "Limit reached. Upgrade to continue."
//             });

//         }

//         const response = await AI.chat.completions.create({
//             model: "openai/gpt-3.5-turbo",
//             messages: [
//                 {
//                     role: "user",
//                     content: prompt,
//                 },
//             ],
//         });

//         const content = response.choices[0].message.content;

//         await sql`
//         INSERT INTO creations(user_id,prompt,content,type)
//         VALUES(${userId},${prompt},${content},'blog-title')
//         `;

//         if (plan !== 'premium') {

//             await clerkClient.users.updateUserMetadata(userId, {
//                 privateMetadata: {
//                     free_usage: free_usage + 1
//                 }
//             });

//         }

//         res.json({
//             success: true,
//             content
//         });

//     } catch (error) {

//         console.log(error);

//         res.json({
//             success: false,
//             message: error.message
//         });

//     }

// }

//updated 
export const generateBlogTitle = async (req, res) => {

    try {

        const { userId } = req.auth();

        const { prompt } = req.body;

        const plan = req.plan;
        const free_usage = req.free_usage;

        if (plan !== 'premium' && free_usage >= 10) {

            return res.json({
                success: false,
                message: "Limit reached. Upgrade to continue."
            });

        }

        const enhancedPrompt = `
You are an expert content strategist and SEO blog writer.

Generate highly engaging blog title ideas in proper markdown format.

Topic:
${prompt}

Return the response EXACTLY in this structure:

# Beginner-Friendly Titles
- title 1
- title 2
- title 3

# Intermediate Titles
- title 1
- title 2
- title 3

# Advanced/Professional Titles
- title 1
- title 2
- title 3

Rules:
- Make titles modern and catchy
- Make titles SEO friendly
- Avoid repetition
- Do not add explanations
- Return only markdown
`;

        const response = await AI.chat.completions.create({
            model: "openai/gpt-3.5-turbo",
            messages: [
                {
                    role: "user",
                    content: enhancedPrompt,
                },
            ],
            temperature: 0.8,
            max_tokens: 700,
        });

        const content = response.choices[0].message.content;

        await sql`
        INSERT INTO creations(user_id,prompt,content,type)
        VALUES(${userId},${prompt},${content},'blog-title')
        `;

        if (plan !== 'premium') {

            await clerkClient.users.updateUserMetadata(userId, {
                privateMetadata: {
                    free_usage: free_usage + 1
                }
            });

        }

        res.json({
            success: true,
            content
        });

    } catch (error) {

        console.log(error);

        res.json({
            success: false,
            message: error.message
        });

    }

}


export const generateImage = async (req, res) => {

    try {

        const { userId } = req.auth();

        const { prompt, publish } = req.body;

        const plan = req.plan;


        if (plan !== 'premium') {

            return res.json({
                success: false,
                message: "This feature is only available for premium users"
            });

        }

        const formData = new FormData()
        formData.append('prompt', prompt)
        // console.log(process.env.CLIPDROP_API_KEY);
        const { data } = await axios.post("https://clipdrop-api.co/text-to-image/v1", formData, {
            headers: { 'x-api-key': process.env.CLIPDROP_API_KEY },
            responseType: "arraybuffer",
        })
        const base64Image = `data:image/png;base64,${Buffer.from(data, 'binary').toString('base64')}`;

        const { secure_url } = await cloudinary.uploader.upload(base64Image)
        await sql`
        INSERT INTO creations(user_id,prompt,content,type,publish)
        VALUES(${userId},${prompt},${secure_url},'image',${publish ?? false})
        `;



        res.json({
            success: true,
            content: secure_url
        });

    } catch (error) {

        console.log(error);

        res.json({
            success: false,
            message: error.message
        });

    }

}



export const removeImageBackground = async (req, res) => {

    try {

        const { userId } = req.auth();

        const image = req.file;

        const plan = req.plan;

        if (plan !== 'premium') {

            return res.json({
                success: false,
                message: "This feature is only available for premium users"
            });

        }

        const { secure_url } = await cloudinary.uploader.upload(
            image.path,
            {
                transformation: [
                    {
                        effect: "background_removal"
                    }
                ]
            }
        );

        await sql`
        INSERT INTO creations(user_id,prompt,content,type)
        VALUES(
            ${userId},
            'Remove background from image',
            ${secure_url},
            'image'
        )
        `;

        res.json({
            success: true,
            content: secure_url
        });

    } catch (error) {

        console.log(error);

        res.json({
            success: false,
            message: error.message
        });

    }

}


export const removeImageObject = async (req, res) => {

    try {

        const { userId } = req.auth();
        const { object } = req.body;
        const image = req.file;

        const plan = req.plan;

        if (plan !== 'premium') {

            return res.json({
                success: false,
                message: "This feature is only available for premium users"
            });

        }
        if (!image || !object) {

            return res.json({
                success: false,
                message: "Image and object are required"
            });

        }

        const { public_id } = await cloudinary.uploader.upload(image.path)

        const imageUrl = cloudinary.url(public_id, {
            transformation: [{ effect: `gen_remove:${object}` }],
            resource_type: 'image'
        })
        await sql`
        INSERT INTO creations(user_id,prompt,content,type)
        VALUES(
            ${userId},
            ${`Removed ${object} from image`},
            ${imageUrl},
            'image'
        )
        `;

        res.json({
            success: true,
            content: imageUrl
        });

    } catch (error) {

        console.log(error);

        res.json({
            success: false,
            message: error.message
        });

    }

}



export const resumeReview = async (req, res) => {

    try {

        const { userId } = req.auth();

        const resume = req.file;

        const plan = req.plan;

        if (plan !== 'premium') {

            return res.json({
                success: false,
                message: "This feature is only available for premium users"
            });

        }
        if (!resume) {
            return res.json({
                success: false,
                message: "Resume file is required"
            });
        }
        if (resume.size > 5 * 1024 * 1024) {
            return res.json({ success: false, message: "Resume file size exceeds allowed size(5MB)," })
        }

        const dataBuffer = fs.readFileSync(resume.path)
        const pdfData = await pdf(dataBuffer)
        // const prompt = `Review the following resume and provide constructive feedback on its strengths, weakness, and areas for improvement. Resume Content:\n\n${pdfData.text}`
        const prompt = `
        You are an expert ATS resume reviewer.

        Analyze the following resume and return the response in proper markdown format.

        Structure the response EXACTLY like this:

        # Resume Review

        ## Overall Score
        Give a score out of 10.

        ## Strengths
        - point 1
        - point 2
        - point 3

        ## Weaknesses
        - point 1
        - point 2

        ## ATS Optimization Tips
        - point 1
        - point 2

        ## Skills Analysis
        Mention technical and soft skills found.

        ## Experience Review
        Review work experience quality.

        ## Final Suggestions
        Give actionable improvement suggestions.

        Resume Content:
        ${pdfData.text}
        `;

        const response = await AI.chat.completions.create({
            model: "openai/gpt-3.5-turbo",
            messages: [
                {
                    role: "user",
                    content: prompt,
                }
            ],
            temperature: 0.7,
            max_tokens: 1000,
        });

        const content = response.choices[0].message.content;
        await sql`
        INSERT INTO creations(user_id,prompt,content,type)
        VALUES(
            ${userId},
            'Review the uploaded resume',
            ${content},
            'resume-review'
        )
        `;

        res.json({
            success: true,
            content
        });

    } catch (error) {

        console.log(error);

        res.json({
            success: false,
            message: error.message
        });

    }

}