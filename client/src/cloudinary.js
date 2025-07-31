// Cloudinary configuration
// Replace these with your actual Cloudinary credentials
const CLOUDINARY_CONFIG = {
  cloudName: 'dquctzvgb', // Replace with your cloud name
  apiKey: '323697112996463', // Replace with your API key
  apiSecret: 'c8K4t6iLoNidq8FD6QbsaGzo7eI' // Replace with your API secret
};

// Upload image to Cloudinary
export const uploadToCloudinary = async (file) => {
  try {
    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'linkboard_preset'); // Change this to match your Cloudinary upload preset name
    formData.append('cloud_name', CLOUDINARY_CONFIG.cloudName);

    // Upload to Cloudinary
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Cloudinary error:', errorData);
      throw new Error(`Failed to upload image: ${response.status}`);
    }

    const data = await response.json();
    return { success: true, url: data.secure_url };
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    return { success: false, message: error.message };
  }
};

// Delete image from Cloudinary (optional)
export const deleteFromCloudinary = async (publicId) => {
  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/destroy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        public_id: publicId,
        api_key: CLOUDINARY_CONFIG.apiKey,
        signature: generateSignature(publicId) // You'll need to implement this
      })
    });

    if (!response.ok) {
      throw new Error('Failed to delete image');
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    return { success: false, message: error.message };
  }
};

// Generate signature for delete operation (you'll need to implement this)
const generateSignature = () => {
  // This requires server-side implementation for security
  // For now, we'll skip delete functionality
  return '';
}; 