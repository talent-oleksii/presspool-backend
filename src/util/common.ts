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
        item?.user_medium === "newsletter" &&
          item.duration > item.count * 1.2 &&
          item.duration > 0
          ? item?.unique_click
          : 0
      ),
    0
  );

  const avgCPC =
    totalBudget === 0 || verifiedClicks === 0
      ? 0
      : totalBudget / verifiedClicks > 10
      ? 10
      : totalBudget / verifiedClicks;

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
