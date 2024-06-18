import { sign } from "jsonwebtoken";

export const calculateCampStats = (campaignData: any, clickedData: any) => {
  const totalClicks = clickedData.reduce(
    (prev: number, item: { count: any }) => prev + Number(item?.count ?? 0),
    0
  );
  const uniqueClicks = clickedData.reduce(
    (prev: number, item: { unique_click: any }) =>
      prev + Number(item?.unique_click ?? 0),
    0
  );

  const totalBudget = campaignData.reduce(
    (prev: number, item: { price: any }) => prev + Number(item?.price ?? 0),
    0
  );

  const totalBilled = campaignData.reduce(
    (prev: number, item: { billed: any }) => prev + Number(item?.billed ?? 0),
    0
  );

  const verifiedClicks = clickedData.reduce(
    (
      prev: number,
      item: {
        user_medium: string;
        duration: number;
        count: number;
        unique_click: any;
      }
    ) =>
      prev +
      Number(
        (item?.user_medium === "newsletter" ||
          item?.user_medium === "referral") &&
          item.duration > item.count * 0.37 &&
          item.duration > 0
          ? item?.unique_click
          : 0
      ),
    0
  );

  const avgCPC =
    totalBilled === 0 || uniqueClicks === 0 ? 0 : totalBilled / uniqueClicks;

  const totalSpend = avgCPC * verifiedClicks;
  return {
    totalSpend,
    avgCPC,
    verifiedClicks,
    totalBudget,
    uniqueClicks,
    totalClicks,
  };
};

const secretKey = "presspool-ai";
export const generateToken = (payload: any, expiresIn: string = "1d") => {
  const token = sign(payload, secretKey, { expiresIn });
  return token;
};

export const generateRandomNumbers = (count: number) => {
  const randomNumbers = [];
  for (let i = 0; i < count; i++) {
    const randomNumber = Math.floor(Math.random() * 10); // Adjust the range as needed
    randomNumbers.push(randomNumber);
  }

  return randomNumbers.join("");
};
