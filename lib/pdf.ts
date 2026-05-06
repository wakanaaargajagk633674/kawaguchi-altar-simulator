async function waitForImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll("img"));

  await Promise.all(
    images.map(async (image) => {
      if (image.complete && image.naturalWidth > 0) {
        return;
      }

      if ("decode" in image) {
        try {
          await image.decode();
          return;
        } catch {
          // Fall back to load/error events below.
        }
      }

      await new Promise<void>((resolve) => {
        image.onload = () => resolve();
        image.onerror = () => resolve();
      });
    }),
  );
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function inlineImagesAsDataUrls(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll<HTMLImageElement>("img"));

  await Promise.all(
    images.map(async (image) => {
      const source = image.getAttribute("src") || image.currentSrc || image.src;

      if (!source || source.startsWith("data:")) {
        return;
      }

      try {
        const url = new URL(source, window.location.origin);
        const response = await fetch(url.toString(), { cache: "force-cache" });

        if (!response.ok) {
          return;
        }

        const blob = await response.blob();
        image.src = await blobToDataUrl(blob);
      } catch (error) {
        console.warn("Failed to inline image for PDF", source, error);
      }
    }),
  );
}

function fitImageToPage(
  imageWidth: number,
  imageHeight: number,
  pageWidth: number,
  pageHeight: number,
) {
  const ratio = Math.min(pageWidth / imageWidth, pageHeight / imageHeight);
  const width = imageWidth * ratio;
  const height = imageHeight * ratio;

  return {
    width,
    height,
    x: (pageWidth - width) / 2,
    y: (pageHeight - height) / 2,
  };
}

export async function createPdfFromElement(
  element: HTMLElement,
  filename: string,
) {
  const pageElements = Array.from(
    element.querySelectorAll<HTMLElement>(".pdf-page"),
  );
  const pages = pageElements.length > 0 ? pageElements : [element];

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  for (const [pageIndex, page] of pages.entries()) {
    await inlineImagesAsDataUrls(page);
    await waitForImages(page);

    const width = page.scrollWidth || 794;
    const height = page.scrollHeight || 1124;
    const canvas = await html2canvas(page, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      allowTaint: false,
      imageTimeout: 15000,
      logging: false,
      width,
      height,
      windowWidth: width,
      windowHeight: height,
      onclone: (clonedDocument, clonedElement) => {
        clonedDocument.documentElement.style.backgroundColor = "#ffffff";
        clonedDocument.body.style.margin = "0";
        clonedDocument.body.style.backgroundColor = "#ffffff";
        clonedDocument.body.style.color = "#0f172a";
        clonedDocument.body.replaceChildren(clonedElement);

        clonedElement.style.position = "static";
        clonedElement.style.left = "auto";
        clonedElement.style.top = "auto";
        clonedElement.style.transform = "none";
        clonedElement.style.backgroundColor = "#ffffff";
        clonedElement.style.color = "#0f172a";
      },
    });

    if (pageIndex > 0) {
      pdf.addPage();
    }

    const imageData = canvas.toDataURL("image/jpeg", 0.95);
    const draw = fitImageToPage(
      canvas.width,
      canvas.height,
      pageWidth,
      pageHeight,
    );

    pdf.addImage(
      imageData,
      "JPEG",
      draw.x,
      draw.y,
      draw.width,
      draw.height,
    );
  }

  pdf.save(filename);
}
