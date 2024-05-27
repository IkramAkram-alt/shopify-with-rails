import { useState } from "react";
import { Card, TextContainer, Text } from "@shopify/polaris";
import { Toast } from "@shopify/app-bridge-react";
import { useTranslation } from "react-i18next";
import { useAppQuery, useAuthenticatedFetch } from "../hooks";

export function ProductsCard() {
  const emptyToastProps = { content: null };
  const [isLoadingPopulate, setIsLoadingPopulate] = useState(false);
  const [isLoadingDownload, setIsLoadingDownload] = useState(false);
  const [toastProps, setToastProps] = useState(emptyToastProps);
  const fetch = useAuthenticatedFetch();
  const { t } = useTranslation();
  const productsCount = 5;

  const {
    data,
    refetch: refetchProductCount,
    isLoading: isLoadingCount,
    isRefetching: isRefetchingCount,
  } = useAppQuery({
    url: "/api/products/count",
    reactQueryOptions: {
      onSuccess: () => {
        setIsLoadingPopulate(false);
        setIsLoadingDownload(false);
      },
    },
  });

  const toastMarkup = toastProps.content && !isRefetchingCount && (
    <Toast {...toastProps} onDismiss={() => setToastProps(emptyToastProps)} />
  );

  const handlePopulate = async () => {
    setIsLoadingPopulate(true);
    const response = await fetch("/api/products", { method: "POST" });

    if (response.ok) {
      await refetchProductCount();
      setToastProps({
        content: t("ProductsCard.productsCreatedToast", {
          count: productsCount,
        }),
      });
      setIsLoadingPopulate(false);
    } else {
      setIsLoadingPopulate(false);
      setToastProps({
        content: t("ProductsCard.errorCreatingProductsToast"),
        error: true,
      });
    }
  };

  const handleDownload = async () => {
    setIsLoadingDownload(true);
    const response = await fetch("/api/orders/download_report", { method: "GET" });

    if (response.ok) {
      // Extract the filename from the Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      const filename = contentDisposition.split("filename=")[1];
      
      // Create a blob object from the response data
      const blob = await response.blob();
      
      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a link element and trigger the download
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      
      // Cleanup the temporary URL
      window.URL.revokeObjectURL(url);
    } else {
      setToastProps({
        content: t("ProductsCard.errorDownloadToast"),
        error: true,
      });
    }
    setIsLoadingDownload(false);
  };

  return (
    <>
      {toastMarkup}
      <Card
        title={t("ProductsCard.title")}
        sectioned
        primaryFooterAction={{
          content: t("ProductsCard.populateProductsButton", {
            count: productsCount,
          }),
          onAction: handlePopulate,
          loading: isLoadingPopulate,
        }}
      >
        <TextContainer spacing="loose">
          <p>{t("ProductsCard.description")}</p>
          <Text as="h4" variant="headingMd">
            {t("ProductsCard.totalProductsHeading")}
            <Text variant="bodyMd" as="p" fontWeight="semibold">
              {isLoadingCount ? "-" : data.count}
            </Text>
          </Text>
        </TextContainer>
      </Card>
      <Card
        title={t("ProductsCard.download")}
        sectioned
        primaryFooterAction={{
          content: t("ProductsCard.download_btn"),
          onAction: handleDownload,
          loading: isLoadingDownload,
        }}
      >
        <TextContainer spacing="loose">
          <p>{t("ProductsCard.download_text")}</p>
          <Text as="h4" variant="headingMd">
            {t("ProductsCard.totalOrders")}
            <Text variant="bodyMd" as="p" fontWeight="semibold">
              {isLoadingCount ? "-" : data.count}
            </Text>
          </Text>
        </TextContainer>
      </Card>
    </>
  );
}
