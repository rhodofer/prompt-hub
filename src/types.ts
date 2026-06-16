export interface Prompt {
  id: string;
  title: string;
  content: string;
  imagePath?: string; // Legacy field for single image backward compatibility
  imagePaths?: string[]; // Array of file paths for multiple images
}
