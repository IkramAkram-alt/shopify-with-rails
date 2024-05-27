# frozen_string_literal: true

class OrdersController < AuthenticatedController
  def download_report
    file_path = DownloadReport.call(session: current_shopify_session, id_token: shopify_id_token)
    send_file file_path, type: 'text/csv', filename: 'order_report.csv'
  rescue StandardError => e
    logger.error("Failed to download orders: #{e.message}")
    render json: { success: false, error: e.message }, status: e.try(:code) || :internal_server_error
  end
end
