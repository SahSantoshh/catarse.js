import m from 'mithril';
import _ from 'underscore';
import moment from 'moment';
import I18n from 'i18n-js';
import h from '../h';
import rewardVM from '../vms/reward-vm';
import userVM from '../vms/user-vm';
import editRewardCard from '../c/edit-reward-card';
import dashboardRewardCard from '../c/dashboard-reward-card';
import projectEditSaveBtn from '../c/project-edit-save-btn';
import popNotification from '../c/pop-notification';

const I18nScope = _.partial(h.i18nScope, 'projects.reward_fields');

const projectEditReward = {
    controller(args) {
        const rewards = m.prop([]),
            loading = m.prop(false),
            error = m.prop(false),
            errors = m.prop([]),
            showSuccess = m.prop(false),
            availableCount = reward => reward.maximum_contributions - reward.paid_count,
            updateRewardData = () => {
                const data = $('#reward_form').serialize();
                loading(true);
                // m.request won't serialize params properly here
                return $.ajax({
                    type: 'PATCH',
                    url: `/en/projects/${args.project_id}'`,
                    data,
                    dataType: 'JSON'
                }).done(() => {
                    error(false);
                    showSuccess(true);
                    loadRewards();
                    m.redraw();
                }).fail((json) => {
                    error(true);
                    showSuccess(false);
                    const messages = JSON.parse(json.responseText).errors.join('</br>');
                    errors(messages);
                }).always(() => {
                    loading(false);
                    m.redraw();
                });
            },
            onSubmit = () => {
                error(false);
                errors('Error saving information. Check the data reported.');
                _.map(rewards(), (reward) => {
                    if (reward().validate) {
                        reward().validate();
                    }
                });
                if (!error()) {
                    updateRewardData();
                }

                return false;
            },
            newReward = () => ({
                id: null,
                minimum_value: null,
                title: null,
                deliver_at: moment().date(1).format(),
                description: null,
                paid_count: 0,
                edit: m.prop(true),
                limited: h.toggleProp(false, true),
                maximum_contributions: null,
                newReward: true,
                row_order: 999999999 + (rewards().length * 20) // we need large and spaced apart numbers
            });

        const updateRewardSortPosition = (rewardId, position) => m.request({
            method: 'POST',
            url: `/en/projects/${args.project_id}/rewards/${rewardId}/sort?reward[row_order_position]=${position}`,
            config: (xhr) => {
                if (h.authenticityToken()) {
                    xhr.setRequestHeader('X-CSRF-Token', h.authenticityToken());
                    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
                }
            }
        });

        const setSorting = (el, isInit) => {
            if (!isInit && window.$) {
                window.$(el).sortable({
                    update: (event, ui) => {
                        const rewardId = ui.item[0].id;
                        updateRewardSortPosition(rewardId, ui.item.index());
                    }
                });
            }
        };

        const loadRewards = () => rewardVM.fetchRewards(args.project_id).then(() => {
            rewards([]);
            _.map(rewardVM.rewards(), (reward) => {
                const limited = reward.maximum_contributions !== null;
                _.extend(reward, {
                    edit: h.toggleProp(false, true),
                    limited: h.toggleProp(limited, !limited)
                });
                rewards().push(m.prop(reward));
            });

            if (rewardVM.rewards().length === 0) {
                rewards().push(m.prop(newReward()));
            }
        });

        const tips = I18n.translations[I18n.currentLocale()].projects.reward_fields.faq;

        loadRewards();

        return {
            loading,
            error,
            errors,
            showSuccess,
            rewards,
            onSubmit,
            user: userVM.fetchUser(args.user_id),
            availableCount,
            newReward,
            setSorting,
            tips
        };
    },

    view(ctrl, args) {
        const error = ctrl.error,
            project = args.project;

        return m("[id='dashboard-rewards-tab']",
                 (project() ? [
                     m('.w-section.section',
                m('.w-container', [
                    (ctrl.showSuccess() ? m.component(popNotification, {
                        message: 'Rewards successfully saved'
                    }) : ''),
                    (ctrl.error() ? m.component(popNotification, {
                        message: ctrl.errors(),
                        error: true
                    }) : ''),
                    // m('.w-row',
                    //     m('.w-col.w-col-8.w-col-push-2',
                    //         m('.u-marginbottom-60.u-text-center',
                    //             m('.w-inline-block.card.fontsize-small.u-radius',
                    //                 [
                    //                     m('span.fa.fa-lightbulb-o'),
                    //                     m.trust(` ${I18n.t('reward_know_more_cta_html', I18nScope())}`)
                    //                 ]
                    //             )
                    //         )
                    //     )
                    // ),
                    m('.w-row',
                        [
                            m('.w-col.w-col-9',
                                m('form.simple_form.project-form.w-form[id=\'reward_form\']', {
                                    onsubmit: ctrl.onSubmit
                                }, [
                                    m("input[name='utf8'][type='hidden'][value='✓']"),
                                    m("input[name='_method'][type='hidden'][value='patch']"),
                                    m(`input[name="authenticity_token"][type="hidden"][value=${h.authenticityToken()}]`),
                                    m(`input[id='project_id'][name='project_id'][type='hidden'][value='${args.project_id}']`),
                                    m("input[id='anchor'][name='anchor'][type='hidden'][value='reward']"),
                                    m("[id='dashboard-rewards']", [

                                        ctrl.rewards().length === 0 ? '' : m(".ui-sortable[id='rewards']", {
                                            config: ctrl.setSorting
                                        }, [
                                            _.map(_.sortBy(ctrl.rewards(), reward => Number(reward().row_order)), (reward, index) => m(`div[id=${reward().id}]`, [m('.nested-fields',
                                                    m('.reward-card', [
                                                        (!reward().edit() ?
                                                            m(dashboardRewardCard, {
                                                                index,
                                                                reward,
                                                                error,
                                                                user: ctrl.user(),
                                                                project_id: args.project_id,
                                                                project_state: project().state
                                                            }) :
                                                            m(editRewardCard, {
                                                                project_id: args.project_id,
                                                                error,
                                                                reward,
                                                                index
                                                            }))
                                                    ])
                                                ),
                                                m(`input.ui-sortable-handle[id='project_rewards_attributes_${index}_id'][type='hidden']`, {
                                                    name: `project[rewards_attributes][${index}][id]`,
                                                    value: reward().id
                                                })
                                            ]))
                                        ]),

                                    ])
                                ]),
                              rewardVM.canAdd(project().state, ctrl.user()) ? [
                                  m('button.btn.btn-large.btn-message.show_reward_form.new_reward_button.add_fields', {
                                      onclick: () => ctrl.rewards().push(m.prop(ctrl.newReward()))
                                  },
                                        I18n.t('add_reward', I18nScope())
                                    )

                              ] : ''
                            ),
                            m('.w-col.w-col-3', [
                                I18n.t('reward_faq_intro', I18nScope()),
                                m('br'),
                                m('br'),
                                I18n.t('reward_faq_sub_intro', I18nScope()),
                                m('br'),
                                m('br'),
                                _.map(ctrl.tips, tip => [
                                    m('.fontweight-semibold', tip.title),
                                    m.trust(tip.description),
                                    m('br'),
                                    m('br')
                                ])
                            ])
                        ]
                    )
                ]),
                rewardVM.canAdd(project().state, ctrl.user()) ? [
                    m(projectEditSaveBtn, {
                        loading: ctrl.loading,
                        onSubmit: ctrl.onSubmit
                    })
                ] : ''
            )] : h.loader())
        );
    }
};

export default projectEditReward;
