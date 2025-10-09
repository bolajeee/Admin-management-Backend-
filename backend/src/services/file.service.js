import cloudinary from "../lib/cloudinary.js";

class FileService {
    static async handleUpload(file) {
        return await cloudinary.uploader.upload(file, { resource_type: "auto" });
    }

    static getB64(file) {
        return Buffer.from(file.buffer).toString("base64");
    }

    static getDataURI(file) {
        const b64 = this.getB64(file);
        return `data:${file.mimetype};base64,${b64}`;
    }
}

export default FileService;