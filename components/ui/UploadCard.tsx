"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { UploadCloud } from "lucide-react";

export default function UploadCard() {
  const [isHovered, setIsHovered] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        console.log("Success! Image saved to database:", data.item);
        alert("Upload complete! Check your console.");
      } else {
        console.error("Upload failed:", data.error);
        alert("Upload failed.");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <motion.div
      className="relative flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-xl bg-white overflow-hidden cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <input
        type="file"
        accept="image/*"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        onChange={handleFileUpload}
        disabled={isUploading}
      />

      <motion.div
        animate={{ y: isHovered ? -5 : 0 }}
        className="flex flex-col items-center text-gray-500"
      >
        <UploadCloud
          size={40}
          className={`mb-4 ${isUploading ? "text-blue-400 animate-bounce" : "text-gray-400"}`}
        />
        <span className="font-medium">
          {isUploading
            ? "Processing AI Magic..."
            : "Click or drag a photo here"}
        </span>
        {!isUploading && (
          <span className="text-sm text-gray-400 mt-2">
            AI will remove the background instantly
          </span>
        )}
      </motion.div>
    </motion.div>
  );
}
