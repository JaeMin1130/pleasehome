package com.pleasehome.backend.config

import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.data.jpa.repository.config.EnableJpaRepositories
import org.springframework.jdbc.datasource.DriverManagerDataSource
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
    fun memberDataSource(): DataSource =
        DriverManagerDataSource().apply {
            setDriverClassName("org.sqlite.JDBC")
            url = dbUrl
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
