import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "200mb" }));
  app.use(express.urlencoded({ extended: true, limit: "200mb" }));

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Server-side Drive upload proxy helper if needed
  app.post("/api/drive/upload", async (req, res) => {
    try {
      const { accessToken, fileName, mimeType, folderId: reqFolderId, fileData } = req.body;
      if (!accessToken || !fileName || !fileData) {
        return res.status(400).json({ error: "Thiếu thông tin yêu cầu (accessToken, fileName, fileData)" });
      }

      let folderId = reqFolderId;
      if (!folderId) {
        try {
          const folderName = 'Ghi hinh';
          const q = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
          const searchRes = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            if (searchData.files && searchData.files.length > 0) {
              folderId = searchData.files[0].id;
            } else {
              const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  name: folderName,
                  mimeType: "application/vnd.google-apps.folder",
                }),
              });
              if (createRes.ok) {
                const createData = await createRes.json();
                folderId = createData.id;
              }
            }
          }
        } catch (fErr) {
          console.warn("Folder check error in server route:", fErr);
        }
      }

      // Convert base64 data to buffer
      const base64Content = fileData.includes(",") ? fileData.split(",")[1] : fileData;

      const metadata: Record<string, any> = {
        name: fileName,
        mimeType: mimeType || "video/mp4",
      };
      if (folderId) {
        metadata.parents = [folderId];
      }

      const boundary = "-------314159265358979323846";
      const delimiter = "\r\n--" + boundary + "\r\n";
      const close_delim = "\r\n--" + boundary + "--";

      const multipartRequestBody =
        delimiter +
        "Content-Type: application/json\r\n\r\n" +
        JSON.stringify(metadata) +
        delimiter +
        `Content-Type: ${mimeType || "video/mp4"}\r\n` +
        "Content-Transfer-Encoding: base64\r\n\r\n" +
        base64Content +
        close_delim;

      const response = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,size",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": `multipart/related; boundary=${boundary}`,
          },
          body: multipartRequestBody,
        }
      );

      const result = await response.json();
      if (!response.ok) {
        console.error("Google Drive Upload Error:", result);
        return res.status(response.status).json({ error: result.error?.message || "Tải lên Google Drive thất bại" });
      }

      return res.json({ success: true, file: result });
    } catch (error: any) {
      console.error("Upload handler error:", error);
      return res.status(500).json({ error: error.message || "Lỗi xử lý server" });
    }
  });

  // Vite development middleware or production static files
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server started on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
