package tn.matchmakers.socialservice.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI socialServiceOpenAPI() {
        Server server = new Server();
        server.setUrl("http://localhost:8090/social");
        server.setDescription("Social Service - Development");

        Contact contact = new Contact();
        contact.setName("MatchMakers Team");
        contact.setEmail("support@matchmakers.com");

        License license = new License()
                .name("Apache 2.0")
                .url("https://www.apache.org/licenses/LICENSE-2.0.html");

        Info info = new Info()
                .title("Social Service API")
                .version("1.0.0")
                .description("API de gestion des posts, commentaires, réactions, messages et conversations")
                .contact(contact)
                .license(license);

        return new OpenAPI()
                .info(info)
                .servers(List.of(server));
    }
}
