import fs from "fs";
import { userService } from "./app/services/user.js";

async function generateQR() {
  const blob = await userService.generateQrCode(
    "https://bozo.squidl.me",
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRfcoTwHrfGAUBiFJv5FedKRwdXpd8mkStN-Q&s"
  );
  fs.writeFileSync("qr-code.png", blob);
  console.log({ blob });
}