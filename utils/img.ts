export const resizeImage = (
	base64Str: string,
	maxWidth = 750,
	maxHeight = 750,
): Promise<string> => {
	return new Promise((resolve) => {
		const img = new Image()
		img.src = base64Str
		img.onload = () => {
			let width = img.width
			let height = img.height

			if (width > height) {
				if (width > maxWidth) {
					height = Math.round((height *= maxWidth / width))
					width = maxWidth
				}
			} else {
				if (height > maxHeight) {
					width = Math.round((width *= maxHeight / height))
					height = maxHeight
				}
			}

			const canvas = document.createElement('canvas')
			canvas.width = width
			canvas.height = height
			const ctx = canvas.getContext('2d')
			ctx?.drawImage(img, 0, 0, width, height)

			resolve(canvas.toDataURL('image/jpeg', 0.8))
		}
	})
}
