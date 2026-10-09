use redis::aio::MultiplexedConnection;
use redis::AsyncCommands;

use crate::messages::{last_value_key, LiveFeedMessage};

#[derive(Clone)]
pub struct RedisPublisher {
    connection: MultiplexedConnection,
    last_value_ttl_seconds: u64,
}

impl RedisPublisher {
    pub async fn connect(redis_url: &str, last_value_ttl_seconds: u64) -> redis::RedisResult<Self> {
        let client = redis::Client::open(redis_url)?;
        let connection = client.get_multiplexed_async_connection().await?;
        tracing::info!("[ingest][redis] connected");
        Ok(Self {
            connection,
            last_value_ttl_seconds,
        })
    }

    pub async fn publish(
        &self,
        channel: &str,
        message: &LiveFeedMessage,
    ) -> redis::RedisResult<()> {
        let payload = serde_json::to_string(message).expect("live feed json");
        let mut connection = self.connection.clone();
        let _: i64 = connection.publish(channel, &payload).await?;
        let key = last_value_key(channel);
        connection
            .set_ex::<_, _, ()>(key, payload, self.last_value_ttl_seconds)
            .await?;
        Ok(())
    }
}
