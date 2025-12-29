import { createApiHandler } from '@/lib/api/methodRouter'
import { withAuth, AuthRequest } from '@/lib/auth'
import { NextApiResponse } from 'next'
import axios from 'axios'

export const config = {
	api: {
		bodyParser: {
			sizeLimit: '10mb',
		},
	},
}

const SYSTEM_PROMPT = `
You are a coffee expert and data entry assistant. Your goal is to extract structured data from an image of a coffee bag, supplementing it with accurate details found on the web.

Instructions:
1.  Analyze the Image: Identify the coffee name, roaster and other identifying details from the image.
2.  Web Search: Use these details to find the official product page or reputable retailers.
3.  Extract Details: Fill in the following fields based on the image first and web results secondarily if details are missing.
  name: The specific name of the coffee/blend.
  roaster: The company name.
  origin: The country or region (e.g., "Ethiopia", "Yirgacheffe").
  process: The processing method (e.g., "Washed", "Natural", "Honey", "Anaerobic").
  roastLevel: One of ["Light", "Medium-Light", "Medium", "Medium-Dark", "Dark"]. ONLY provide this if explicitly stated by the roaster. If not specified, return null. Do NOT guess based on color.
  tastingNotes: A single string of comma-separated notes (e.g., "Jasmine, Peach, Honey").
  roastDate: Format YYYY-MM-DD. Look for "Roasted on", "RD", or stamped dates on the bag. If not found, return null. the current year is ${new Date().getFullYear()}, for any dates that don't include a year, use this year.
  weight: Weight of beans in the bag, if visible, return a number only if the amount is in grams (ie "200" rather than "200g").
  producer: name of the producer of the coffee if available
4.  Accuracy: Only use details from the roaster's website or identical products. Avoid

Output Format:
Return ONLY a valid JSON object. Do not include markdown formatting or explanations.
`

async function handlePost(req: AuthRequest, res: NextApiResponse) {
	const apiKey = process.env.OPENROUTER_API_KEY
	if (!apiKey)
		return res.status(503).json({ error: 'AI service not configured' })

	const { image } = req.body
	if (!image) return res.status(400).json({ error: 'Image required' })

	try {
		const response = await axios.post(
			'https://openrouter.ai/api/v1/chat/completions',
			{
				model: 'google/gemini-3-flash-preview:online',
				messages: [
					{
						role: 'system',
						content: SYSTEM_PROMPT,
					},
					{
						role: 'user',
						content: [
							{
								type: 'image_url',
								image_url: {
									url: image,
								},
							},
						],
					},
				],
			},
			{
				headers: {
					Authorization: `Bearer ${apiKey}`,
					'Content-Type': 'application/json',
				},
			},
		)

		const data = response.data
		const content = data.choices[0].message.content

		const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) ||
			content.match(/```\n([\s\S]*?)\n```/) || [null, content]
		const jsonStr = jsonMatch[1] || content

		const result = JSON.parse(jsonStr)
		return res.status(200).json(result)
	} catch (error) {
		console.error(error)
		return res.status(500).json({ error: 'Failed to analyze image' })
	}
}

export default withAuth(createApiHandler({ POST: handlePost }))
