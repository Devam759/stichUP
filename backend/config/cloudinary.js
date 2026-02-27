import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * uploadBuffer — upload a file buffer to Cloudinary
 * @param {Buffer} buffer  - file buffer from multer memoryStorage
 * @param {string} folder  - Cloudinary folder name (e.g. 'job-proofs')
 * @returns {Promise<string>} - secure_url of uploaded image
 */
export const uploadBuffer = (buffer, folder = 'stitchup') => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder, resource_type: 'image' },
            (err, result) => {
                if (err) return reject(err);
                resolve(result.secure_url);
            }
        );
        stream.end(buffer);
    });
};

export default cloudinary;
