# frozen_string_literal: true

class DownloadReport < ApplicationService
  include ShopifyApp::AdminAPI::WithTokenRefetch

  attr_reader :session, :id_token

  ORDERS_QUERY = <<~QUERY
    query GetOrders($qty: Int, $continueFrom: String) {
      orders(first: $qty, after: $continueFrom, reverse: false, query: "created_at:>2023-10-01T20:00:00") {
        edges {
          node {
            id
            createdAt
            updatedAt
            name
            currencyCode
            totalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            subtotalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            totalShippingPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            totalTaxSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            shippingAddress {
              address1
              address2
              city
              country
              zip
            }
            lineItems(first: 50) {
              edges {
                node {
                  title
                  quantity
                }
              }
            }
          }
        }
      }
    }
  QUERY

  def initialize(session:, id_token:)
    @session = session
    @id_token = id_token
  end

  def call
    response = with_token_refetch(session, id_token) do
      client = ShopifyAPI::Clients::Graphql::Admin.new(session: session)
      client.query(query: ORDERS_QUERY, variables: { qty: 100, continueFrom: nil })
    end

    if response.body['errors']
      raise StandardError, response.body['errors'].to_s
    end

    orders_data = response.body.dig('data', 'orders')
    raise StandardError, "No orders data found" if orders_data.nil?

    file_path = process_response(orders_data)
    file_path
  rescue StandardError => e
    Rails.logger.error("Failed to download orders: #{e.message}")
    raise
  end

  private

  def process_response(orders)
    # Generate CSV data
    csv_data = CSV.generate(headers: true) do |csv|
      csv << [
        'Order ID', 'Created At', 'Updated At', 'Name', 'Currency Code',
        'Total Price', 'Subtotal Price', 'Total Shipping Price', 'Total Tax',
        'Shipping Address 1', 'Shipping Address 2', 'City', 'Country', 'ZIP',
        'Line Items'
      ]
      orders['edges'].each do |edge|
        order = edge['node']
        csv << [
          order['id'], order['createdAt'], order['updatedAt'], order['name'], order['currencyCode'],
          order.dig('totalPriceSet', 'shopMoney', 'amount'), order.dig('subtotalPriceSet', 'shopMoney', 'amount'),
          order.dig('totalShippingPriceSet', 'shopMoney', 'amount'), order.dig('totalTaxSet', 'shopMoney', 'amount'),
          order.dig('shippingAddress', 'address1'), order.dig('shippingAddress', 'address2'), order.dig('shippingAddress', 'city'),
          order.dig('shippingAddress', 'country'), order.dig('shippingAddress', 'zip'),
          order['lineItems']['edges'].map { |item| "#{item['node']['title']} (#{item['node']['quantity']})" }.join(", ")
        ]
      end
    end

    file_path = Rails.root.join('tmp', 'order_report.csv')
    File.open(file_path, 'w') { |file| file.write(csv_data) }

    file_path.to_s
  end
end
