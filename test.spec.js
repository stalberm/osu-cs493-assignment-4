const axios = require("axios");
const fs = require("fs");

describe("/photos", () => {
  let photoId;
  test("POST should respond with 201 status code and inserted id in the body", async () => {
    const businessId = "123456789012345678901234";
    const photoData = fs.readFileSync("./profile.png");
    const photoBlob = new Blob([photoData], { type: "image/png" });

    const formData = new FormData();
    formData.append("image", photoBlob, "profile.png");
    formData.append("businessId", businessId);

    try {
      // Send POST request with FormData
      const response = await axios.post(
        "http://localhost:8000/photos",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty("id");
      expect(response.data).toHaveProperty("links");
      expect(response.data.links.meta).toMatch(`/photos/${response.data.id}`);
      expect(response.data.links.photoUrl).toMatch(
        `/media/photos/${response.data.id}`
      );
      expect(response.data.links.thumbnailUrl).toMatch(
        `/media/thumbs/${response.data.id}`
      );
      photoId = response.data.id;
    } catch (error) {
      console.error("Error uploading photo:", error);
      throw error;
    }
  });

  test("GET {id} should respond with 200 status code and photo meta data", async () => {
    const businessId = "123456789012345678901234";

    try {
      const response = await axios.get(
        `http://localhost:8000/photos/${photoId}`
      );
      expect(response.status).toBe(200);
    } catch (error) {
      console.error("Error uploading photo:", error);
      throw error;
    }
  });
});
