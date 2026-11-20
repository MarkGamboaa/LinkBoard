// Unsigned upload preset: no API key or secret belongs in browser code.
const CLOUD_NAME = 'dquctzvgb';
const UPLOAD_PRESET = 'linkboard_preset';

export const uploadToCloudinary = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Cloudinary error:', errorData);
      throw new Error(`Failed to upload image: ${response.status}`);
    }

    const data = await response.json();
    // Serve a small, auto-format avatar instead of the full original upload.
    return { success: true, url: data.secure_url.replace('/upload/', '/upload/c_fill,g_face,w_256,h_256,f_auto,q_auto/') };
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    return { success: false, message: error.message };
  }
};
