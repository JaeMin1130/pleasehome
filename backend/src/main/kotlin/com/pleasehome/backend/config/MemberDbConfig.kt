package com.pleasehome.backend.config

import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.data.jpa.repository.config.EnableJpaRepositories
import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import org.springframework.orm.jpa.JpaTransactionManager
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter
import org.springframework.transaction.PlatformTransactionManager
import org.springframework.transaction.annotation.EnableTransactionManagement
import javax.sql.DataSource

@Configuration
@EnableTransactionManagement
@EnableJpaRepositories(
    basePackages = ["com.pleasehome.backend.member.repository"],
    entityManagerFactoryRef = "memberEntityManagerFactory",
    transactionManagerRef = "memberTransactionManager"
)
class MemberDbConfig(
    @Value("\${spring.user.datasource.url}")
    private val dbUrl: String
) {

    @Bean
    fun memberDataSource(): DataSource {
        val config = HikariConfig().apply {
            driverClassName = "org.sqlite.JDBC"
            jdbcUrl = dbUrl
            maximumPoolSize = 5
            minimumIdle = 1
            idleTimeout = 600000
            connectionTimeout = 30000
            connectionInitSql = "PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA busy_timeout=15000; PRAGMA cache_size=-32000; PRAGMA temp_store=MEMORY;"
            // 읽고-쓰기(findById→save) 트랜잭션이 동시 쓰기와 겹치면 DEFERRED에선 SQLITE_BUSY_SNAPSHOT으로 즉시 실패한다.
            // IMMEDIATE로 시작하면 쓰기 잠금을 먼저 잡고 나머지는 busy_timeout만큼 대기 후 순차 처리된다.
            addDataSourceProperty("transaction_mode", "IMMEDIATE")
            poolName = "MemberHikariPool"
        }
        return HikariDataSource(config)
    }

    @Bean
    fun memberEntityManagerFactory(
        @Qualifier("memberDataSource") dataSource: DataSource
    ): LocalContainerEntityManagerFactoryBean =
        LocalContainerEntityManagerFactoryBean().apply {
            this.dataSource = dataSource
            setPackagesToScan("com.pleasehome.backend.member.entity")
            jpaVendorAdapter = HibernateJpaVendorAdapter()
            setJpaPropertyMap(mapOf(
                "hibernate.dialect" to "org.hibernate.community.dialect.SQLiteDialect",
                "hibernate.hbm2ddl.auto" to "none"
            ))
            persistenceUnitName = "member"
        }

    @Bean
    fun memberTransactionManager(
        @Qualifier("memberEntityManagerFactory") entityManagerFactory: LocalContainerEntityManagerFactoryBean
    ): PlatformTransactionManager =
        JpaTransactionManager(entityManagerFactory.`object`!!)
}
