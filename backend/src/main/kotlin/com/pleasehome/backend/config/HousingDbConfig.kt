package com.pleasehome.backend.config

import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Primary
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
    basePackages = ["com.pleasehome.backend.housing.repository"],
    entityManagerFactoryRef = "housingEntityManagerFactory",
    transactionManagerRef = "housingTransactionManager"
)
class HousingDbConfig(
    @Value("\${spring.housing.datasource.url}")
    private val dbUrl: String
) {

    @Primary
    @Bean
    fun housingDataSource(): DataSource =
        DriverManagerDataSource().apply {
            setDriverClassName("org.sqlite.JDBC")
            url = dbUrl
        }

    @Primary
    @Bean
    fun housingEntityManagerFactory(
        @Qualifier("housingDataSource") dataSource: DataSource
    ): LocalContainerEntityManagerFactoryBean =
        LocalContainerEntityManagerFactoryBean().apply {
            this.dataSource = dataSource
            setPackagesToScan("com.pleasehome.backend.housing.entity")
            jpaVendorAdapter = HibernateJpaVendorAdapter()
            setJpaPropertyMap(mapOf(
                "hibernate.dialect" to "org.hibernate.community.dialect.SQLiteDialect",
                "hibernate.hbm2ddl.auto" to "none"
            ))
            persistenceUnitName = "housing"
        }

    @Primary
    @Bean
    fun housingTransactionManager(
        @Qualifier("housingEntityManagerFactory") entityManagerFactory: LocalContainerEntityManagerFactoryBean
    ): PlatformTransactionManager =
        JpaTransactionManager(entityManagerFactory.`object`!!)
}
