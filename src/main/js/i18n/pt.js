const BASE_PT = {
    translations: { void: ""
        , home_menu_salute: "Olá"
        , home_menu_start_session: "Iniciar Sessão"
        , home_menu_sessions: "Sessões"
        , home_menu_settings: "Definições"
        , home_menu_last_record: "Último registo"
        , home_header: "Últimas sessões; Média: $1"
        , home_header_no_sessions: "Nenhuma sessão recente encontrada"

        , settings_title: "Definições"
        , settings_menu_coach: "Treinadores"
        , settings_menu_language: "Idioma"
        , settings_menu_type_of_boat: "Tipo de barco"
        , settings_menu_units: "Unidades"
        , settings_menu_black_and_white: "Preto e branco"
        , settings_menu_save_session_layout: "Guardar o layout da sessão"
        , settings_menu_portrait_mode: "Modo vertical"
        , settings_menu_gps_refresh_rate: "Velocidade GPS"
        , settings_menu_heart_rate_sensor: "Bandas Freq. Cardíaca"
        , settings_menu_heart_rate: "Freq. Cardíaca"
        , settings_menu_strava: "Strava"
        , settings_menu_calibrate: "Calibração"
        , settings_menu_calibrate_how_to: "Instruções"
        , settings_menu_profile: "A minha conta"
        , settings_menu_version: "Versão"

        , manage_coach_title: "Gestão de Treinadores"
        , manage_coach_no_coach_found: "Junta-te à equipa do teu treinador"
        , manage_coach_helper_link: "Como funciona?"
        , manage_coach_i_have_an_invitation_code: "Tenho o código do treinador"
        , manage_coach_i_have_an_email_address: "Tenho o endereço de e-mail"
        , manage_coach_action_remove: "Abandonar"
        , manage_coach_add_code_placeholder: "CÓDIGO TREINADOR"
        , manage_coach_add_email_placeholder: "E-MAIL"
        , manage_coach_confirm_statement: "Estás a tentar juntar-te à equipa do treinador:"
        , manage_coach_confirm_question: "Tens a certeza?"
        , manage_coach_confirm_proceed: "Sim"
        , manage_coach_confirm_cancel: "Não"
        , manage_coach_no_account_found_you_need_an_account: "Antes de te juntares à equipa, precisamos de saber quem tu és"
        , manage_coach_no_account_found_action: "Criar conta agora?"
        , manage_coach_no_account_found_create: "Sim"
        , manage_coach_no_account_found_skip: "Não"
        , manage_coach_request_unknown_code: "Código desconhecido"
        , manage_coach_request_unknown_code_message: "Confirma o código partilhado pelo teu treinador e tenta novamente"
        , manage_coach_request_unknown_code_acknowledge: "OK"
        , manage_coach_request_already_a_coach: "Treinador existente"
        , manage_coach_request_already_a_coach_message: "Já fazes parte da equipa do $1."
        , manage_coach_request_already_a_coach_acknowledge: "OK"
        , manage_coach_list_header: "Pertences à equipa dos seguintes treinadores:"
        , manage_coach_connect_button: "Ligar"
        , manage_coach_add_another_coach: "Adicionar novo treinador?"
        , manage_coach_pending: "pendente do treinador"
        , manage_coach_no_internet: "Falhou a ligação à internet. Liga a internet e tenta novamente."
        , manage_coach_no_server_found: "Falhou a comunicação com o servidor. Por favor tenta mais tarde."
        , manage_coach_unexpected_error: "Ocorreu um erro imprevisto. Por favor tenta mais tarde."
        , manage_coach_loading: "A carregar informação do servidor..."
        , manage_coach_invite_sent_title: "Pedido enviado"
        , manage_coach_invite_sent_message: "O teu pedido foi enviado. Agora tens de esperar que o teu treinador te aceite na equipa dele."
        , manage_coach_invite_sent_acknowledge: "ok"

        , blt_screen_title: "Bandas Freq. Cardíaca"
        , blt_searching: "Pesquisar dispositivos Bluetooth"
        , blt_no_devices_found: "Nenhum dispositivo encontrado"
        , blt_no_devices_found_instructions: "Verifique se tem o bluetooth ligado ou"
        , blt_no_devices_found_try_again: "tente de novo"

        , blt_device_name: "Dispositivo"
        , blt_device_last_seen: "Visto a"
        , blt_device_forget: "Esquecer"

        , gps_refresh_rate_title: "Velocidade GPS"

        , heart_rate_title: "Frequência Cardíaca"
        , heart_rate_resting: "Em repouso"
        , heart_rate_max: "Máxima"

        , calibrate_step_1_mount_phone: "Montar o telefone"
        , calibrate_step_1_mount_phone_line1: "Fixar o telefone cuidadosamente no barco"
        , calibrate_step_1_mount_phone_line2: "Garantir que o telefone não oscila facilmente"

        , calibrate_step_2_calibrate: "Calibrar"
        , calibrate_step_2_calibrate_line1: "Mantem o barco estável e alinhado"
        , calibrate_step_2_calibrate_line2: "Faça sempre a calibração em terra recorrendo a cavaletes"

        , calibrate_step_3_go: "Feito"
        , calibrate_step_3_go_line1: "Assim que termine a calibração, está pronto para usar e reutilizar"
        , calibrate_step_3_got_it: "Compreendi"

        , calibrating_screen_title: "Calibração"
        , calibrating: "a fazer computação avançada..."
        , calibration_preset_calc: "Iniciar"
        , calibration_preset_calc_tip: "O TELEMÓVEL ESTÁ NO SUPORTE, COLOCADO NO BARCO E O BARCO ESTÁ IMÓVEL E EM LOCAL PLANO"
        , calibration_preset_flat: "NÃO PRECISO DE CALIBRAR"
        , calibration_preset_flat_tip: "Telemóvel irá ser usado deitado, apenas para o treinador acompanhar"
        , calibration_done: "Terminou"

        , select_session_title: "Escolha uma sessão"
        , select_session_free_session: "Sessão Livre"
        , select_session_slave_mode: "Delegar ao treinador"
        , select_session_coach_teaser: "Planear sessão"
        , select_session_slave_mode_description: "Inicia para delegar"
        , select_session_warm_up_before_start: "Aquecer antes de iniciar"
        , select_session_coach_teaser_dialog_title: "Convida o teu treinador"
        , select_session_coach_teaser_dialog_message: "<p>Só os treinadores com conta em <a href=\"https://coach.gopaddler.com\">https://coach.gopaddler.com</a> podem planear sessões.</p><p>&nbsp;</p><p>Convida o teu treinador para teres a experiência completa do GoPaddler.</p>"
        , select_session_coach_teaser_dialog_later: "Mais tarde"
        , select_session_coach_teaser_dialog_invite: "Convidar"

        , session_tip_hold_to_pause: "Pressionar e deslizar para desbloquear"
        , session_tip_swipe_to_swap_metrics: "Deslizar para trocar métricas"
        , session_tip_finish: "OK"

        , session_duration: "Duração"
        , session_splits: "Intervalos"
        , session_splits_before_start: "<p class='small-measure-hint-primary'>Em Aquecimento</p><p class='small-measure-hint-secondary'>Desbloqueia para iniciar as séries</p>"
        , session_speed: "Velocidade"
        , session_avg_speed: "Velocidade média"
        , session_distance: "Distância"
        , session_spm: "Cadência de Remada"
        , session_efficiency: "Deslocamento"
        , session_strokes_hundred: "Remadas/100m"
        , session_pace: "Pace"
        , session_heart_rate: "Frequência Cardíaca"
        , session_unlock: "deslizar para desbloquear"
        , session_start_at_minute_turn: "Iniciar aos 0''"
        , session_start_now: "Iniciar"
        , session_cancel: "Cancelar"
        , session_resume: "continuar"
        , session_finish: "terminar"
        , session_lock: "Bloquear"
        , session_paused: "Sessão em Pausa"
        , units_metric_timer_regular: ""
        , units_metric_timer_large: ""
        , units_metric_splits_regular: ""
        , units_metric_splits_large: ""
        , units_metric_speed_regular: "Km/h"
        , units_metric_speed_large: "Km/h"
        , units_metric_distance_regular: "metros"
        , units_metric_distance_large: "metros"
        , units_metric_spm_regular: "RPM"
        , units_metric_spm_large: "RPM"
        , units_metric_efficiency_regular: "m"
        , units_metric_efficiency_large: "metros"
        , units_metric_strokes_regular: "remadas"
        , units_metric_strokes_large: "remadas"
        , units_metric_pace_regular: "Min/Km"
        , units_metric_pace_large: "Min/Km"
        , units_metric_heartRate_regular: "bpm"
        , units_metric_heartRate_large: "bpm"
        , units_metric_distance_in_session_list_regular: "Km"
        , units_metric_distance_in_session_list_large: "Km"
        , units_imperial_timer_regular: ""
        , units_imperial_timer_large: ""
        , units_imperial_splits_regular: ""
        , units_imperial_splits_large: ""
        , units_imperial_speed_regular: "Mi/h"
        , units_imperial_speed_large: "Mi/h"
        , units_imperial_distance_regular: "Mi"
        , units_imperial_distance_large: "Mi"
        , units_imperial_spm_regular: "RPM"
        , units_imperial_spm_large: "RPM"
        , units_imperial_efficiency_regular: "ft"
        , units_imperial_efficiency_large: "ft"
        , units_imperial_strokes_regular: "remadas"
        , units_imperial_strokes_large: "remadas"
        , units_imperial_pace_regular: "Min/Mi"
        , units_imperial_pace_large: "Min/Mi"
        , units_imperial_heartRate_regular: "bpm"
        , units_imperial_heartRate_large: "bpm"
        , units_imperial_distance_in_session_list_regular: "Mi"
        , units_imperial_distance_in_session_list_large: "Mi"

        , sessions_filter_last_30_days: "Últimos 30 dias"
        , sessions_filter_last_month: "Último mês"
        , sessions_filter_starting_from: "A partir de"
        , sessions_filter_custom_range: "Personalizado"
        , sessions_filter_cancel: "Cancelar"
        , sessions_filter_apply: "Aplicar"
        , sessions_filter_from: "Desde"
        , sessions_filter_to: "a"
        , sessions_summary_speed_label: "Velocidade"
        , sessions_summary_spm_label: "RPM"
        , sessions_summary_spm_length_label: "Deslocamento"
        , sessions_header_date: "Data"
        , sessions_header_duration: "Duração"
        , sessions_header_distance: "Distância"
        , sessions_header_synced: "Sinc."
        , sessions_synced: "Sim"
        , sessions_not_synced: "Não"
        , sessions_no_session_found: "Não há sessões para este período"
        , sessions_force_sync: "Sinc."
        , sessions_delete: "Apagar"
        , sessions_free: "Livre"
        , sessions_summary_modal_sample_session_primary: "exemplo de sessão"
        , sessions_summary_modal_sample_session_secondary: "Para uma melhor experiência apresentamos um exemplo de uma sessão real"

        , session_summary_title: "Sumário"
        , session_summary_finish_button: "Terminar"
        , session_summary_metrics_duration: "Duração"
        , session_summary_metrics_distance: "Distância"
        , session_summary_metrics_speed: "Velocidade"
        , session_summary_metrics_spm: "Cadência"
        , session_summary_metrics_efficiency: "Deslocamento"
        , session_summary_metrics_heart_rate: "Freq. Cardíaca"
        , session_summary_metrics_elevation: "Elevação"

        , session_summary_intervals_title: "Intervalos"
        , session_summary_intervals_duration: "D"
        , session_summary_intervals_distance: "m"
        , session_summary_intervals_speed: "Km/h"
        , session_summary_intervals_spm: "RPM"
        , session_summary_intervals_length: "Desl."
        , session_summary_intervals_heart_rate: "R.C."

        , session_summary_intervals_speed_chart_label: "Velocidade"
        , session_summary_intervals_spm_chart_label: "Cadência de remada"
        , session_summary_intervals_length_chart_label: "Deslocamento"
        , session_summary_intervals_hr_chart_label: "Ritmo cardíaco"
        , session_summary_intervals_altitude_chart_label: "Elevação"

        , session_summary_zones_speed_label: "Velocidade"
        , session_summary_zones_spm_label: "Cadência de Remada"
        , session_summary_zones_spm_speed_label: "Cadência / Velocidade"
        , session_summary_zones_spm_speed_unit: "RPM"
        , session_summary_zones_spm_speed_avg_speed_header: "Vel. Média"
        , session_summary_zones_spm_speed_interval_speed_header: "Intervalo"
        , session_summary_zones_hr_label: "Ritmo cardiaco"

        , choose_boat_title: "Qual o teu barco?"
        , choose_boat_actions: "Seleccione uma opção"
        , choose_boat_option_k1: "Vai kayak"
        , choose_boat_option_c1: "Vai canoa"
        , choose_boat_failed_title: "Impossível gravar definição"
        , choose_boat_failed_retry: "Por favor tente mais tarde."
        , choose_boat_failed_check_internet: "Verifique a sua ligação à internet."
        , choose_boat_failed_acknowledge: "ok"

        , choose_language_title: "Escolha o idioma"
        , choose_language_option_english: "English"
        , choose_language_option_portuguese: "Português"

        , choose_language_restart_app_title: "Idioma alterado"
        , choose_language_restart_app_message: "Reinicia a aplicação para que as alterações tenham efeito"
        , choose_language_restart_app_acknowledge: "Ok"

        , no_calibration_found_alert_title: "Calibração"
        , no_calibration_found_alert_message_line1: "Antes de remar é necessário calibrar a aplicação para o teu dispositivo!"
        , no_calibration_found_alert_message_line2: "Não te preocupes, demora apenas alguns segundos"
        , no_calibration_found_alert_option_calibrate: "Calibrar"
        , no_calibration_found_alert_option_try_it: "Ignorar"

        , new_version_alert_title: "Nova versão do GoPaddler"
        , new_version_alert_message: "É necessária uma actualização para que o teu treinador possa acompanhar a sessão"
        , new_version_alert_acknowledge: "OK"

        , calibration_completed_alert_title: "Calibração finalizada"
        , calibration_completed_alert_message: "Obrigado... inicia uma nova sessão"
        , calibration_completed_alert_acknowledge: "OK"

        , coach_request_message_line1: "Quer acompanhar o teu treino"
        , coach_request_message_warning_start: "Ao aceitar, estás a permitir ao"
        , coach_request_message_warning_finish: "ter acesso aos teus dados!"
        , coach_request_option_allow: "Permitir"
        , coach_request_option_reject: "Rejeitar"

        , settings_update_boat_failed: "Actualização falhou"
        , settings_update_boat_failed_message: "Ocorreu um problema a completar a operação"
        , settings_update_boat_failed_try_again_later: "Por favor tente mais tarde"
        , settings_update_boat_failed_internet_is_required: "É necessária uma ligação à internet para completar esta operação"
        , settings_update_boat_failed_server_unavailable: "O servidor não está disponível!"
        , settings_update_boat_failed_server_back_soon: "Estaremos de volta em breve!"
        , settings_update_boat_failed_acknowledge: "Ok"

        , settings_update_orientation_notification: "Orientação alterada"
        , settings_update_orientation_notification_line1: "Alteração na orientação do dispositivo requer nova calibração!"
        , settings_update_orientation_notification_line2: "Tens a certeza que queres continuar?"
        , settings_update_orientation_notification_accept: "Sim"
        , settings_update_orientation_notification_reject: "Não"

        , settings_update_orientation_notification_applying_changes: "A aplicar alterações..."
        , settings_update_orientation_notification_applying_changes_message: "O ecrã poderá ficar branco por uns instantes"
        , settings_update_orientation_notification_applying_changes_acknowledge: "ok"

        , gps_failed_title_ios: "Localização indesponível"
        , gps_failed_title_message_ios: "Por favor activa os Serviços de Localização nas definições do teu telemóvel"
        , gps_failed_title_android: "Falha de sinal GPS"
        , gps_failed_title_message_android: "Garante que o GPS está ligado nas definições do teu telemóvel"
        , gps_failed_acknowledge: "OK"


        , cancel: "Cancelar"

        , choose_sport_header: "What's your thing?"
        , choose_sport_header_secondary: "(choose the main disciple you will use the app for)"
        , choose_sport_disciple_marathon_sprint: "Marathon / Sprint"
        , choose_sport_disciple_ocean: "Canoe ocean race"
        , choose_sport_disciple_slalom: "White Water (slalom/freestyle/...)"
        , choose_sport_disciple_dragon_boat: "Dragon boat"
        , choose_sport_disciple_paracanoe: "Paracanoe"
        , choose_sport_disciple_sup: "stand up paddling"
        , choose_sport_disciple_other: "other"
        , choose_sport_disciple_coach: "I'm a coach"
        , choose_sport_picked_sup: "Currently SUP is not tested! Git it a try and ping us an e-mail with your feedback."
        , choose_sport_picked_coach: 'If you are a coach, this app is for your athletes! As a coach, create an account at <a class="paddler-link" href="https://gopaddler.com/for-coaches/">our online service</a> instead!'
        , choose_sport_picked_not_supported: "We only tested our app in sprint and marathon! Give it a try and ping us an e-mail with your feedback."
        , choose_sport_picked_not_supported_title: "We are sorry!"
        , choose_sport_picked_not_supported_acknowledge: "OK"

        , coach_redirect_online_you_are_in_the_wrong_place: "As funcionalidades de treinador estão disponíveis online, não na aplicação"
        , coach_redirect_online_you_are_in_the_wrong_place_secondary: "A aplicação destina-se ao uso dos atletas, para recolha de métricas! Como treinador não necessita da aplicação e deve aceder ao serviço pelo síto web"
        , coach_redirect_online_how_it_works: "Forme a sua equipa"
        , coach_redirect_online_how_it_works_secondary: "Isto irá permitir o acesso às métricas dos atletas (durante e depois da sessão) e à preparação do seu plano de treino"
        , coach_redirect_online_action: "Para criar uma conta como treinador, aceda a <span class=\"small\"> https://coach.gopaddler.com</span>"
        , coach_redirect_online_action_redirect: "<span class=\"btn-primary\">Abrir o GoPaddler Coach</span>"
        , coach_redirect_online_action_proceed: "Continuar como atleta"

        , phone_mount_cta_title: "Precisas de um suporte?"
        , phone_mount_cta_message: 'Visita o nosso <a class="paddler-link" href="$1">website</a> e encomanda o nosso suporte para usares o teu telemóvel com toda a segurança!'
        , phone_mount_cta_acknowledge: "OK"

        , coach_slave_network_not_available_title: "Dispositivo Offline"
        , coach_slave_network_not_available_message: "Por favor liga a internet antes de usar esta funcionalidade."
        , coach_slave_network_not_available_acknowledge: "OK"

        , coach_slave_server_not_available_title: "Servidor indesponível"
        , coach_slave_server_not_available_message: "Impossível estabelecer ligação ao servidor! Tenta mais tarde."
        , coach_slave_server_not_available_acknowledge: "OK"

        , coach_slave_connecting_to_server: "A ligar ao servidor..."
        , coach_slave_connection_failed: "Ligação falhou"
        , coach_slave_ready: "À espera do arranque do treinador..."
        , coach_slave_retry: "Tentar novamente"
        , coach_slave_cancel: "Cancelar"
        , coach_slave_leave: "Sair"

        , profile_title: "A minha conta"
        , profile_name_placeholder: "nome"
        , profile_email_placeholder: "e-mail"
        , profile_update_action: "Actualizar"
        , profile_update_error_coach_exists_title: "Conta duplicada"
        , profile_update_error_coach_exists_message: "Já existe uma conta de treinador com esse email. <br/> <br/> Por favor utilize outro email para criar uma conta de atleta"
        , profile_update_error_coach_exists_acknowledge: "OK"
        , profile_update_error_generic_title: "Erro a criar conta"
        , profile_update_error_generic_message: "Erro a processar o seu pedido. <br/> O problema será investigado. <br/></br>Por favor tente mais tarde."
        , profile_update_error_generic_acknowledge: "OK"

        , strava_title: "Strava"
        , strava_connected_has: "Utilizador Strava: $1"

        , universal_link_join_team_title: "Equipa"
        , universal_link_join_team_success: "Foste adicionado à equipa de $1. <br/></br/>Para gerires quem são os teus treinadores, vai a Definições > Treinadores"
        , universal_link_join_team_error: "No foi possível processar o convite. Tenta novamente e, se falhar, envia um convite ao treinador manualmente (vai a Definições > Treinadores)"
        , universal_link_join_team_acknowledge: "OK"
    }
};

export default BASE_PT;