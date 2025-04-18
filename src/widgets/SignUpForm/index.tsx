'use client'
import React from 'react'
import {Controller, useForm, SubmitHandler} from "react-hook-form";
import {CircularProgress} from "@mui/material";
import Link from 'next/link';
import styles from './styles.module.css'
import cn from 'classnames'
import { useUnit } from 'effector-react';
import { $registerError, $registerPending, registerFormSubmitted } from '@/shared/store/auth';

interface RegistrationFormValues {
    username: string;
    password: string;
    registrationError: string;
}

const SignUpForm = () => {
    const {
        handleSubmit,
        formState: { errors },
        control,
    } = useForm<RegistrationFormValues>({
        defaultValues: {
            username: "",
            password: "",
            registrationError: ""
        }
    });

    const [loading, registrationError, register] = useUnit([$registerPending, $registerError, registerFormSubmitted])

    const confirmRegistration: SubmitHandler<RegistrationFormValues> = ({username, password}) => {
        register({
            username,
            password,
        })
    }

    return (
        <div className={styles.registrationContainer}>
            <form className={styles.registrationForm} onSubmit={handleSubmit(confirmRegistration)}>
                <h2 className={styles.formTitle}>Регистрация</h2>
                <div className={styles.inputGroup}>
                    <Controller
                        name="username"
                        control={control}
                        render={({ field }) => (
                            <input type="text" autoComplete="off" {...field} className={cn(styles.defaultInput, {
                                [styles.activeInput]: field.value,
                                [styles.errorInput]: errors.username,
                            })}/>
                        )}
                        rules={{
                            required: "Данное поле обязательно",
                            pattern: {
                                value: /^[a-zA-Z0-9_-]+$/,
                                message: "Некорректный логин",
                            },
                            minLength: {
                                value: 3,
                                message: "Логин должен содержать минимум 3 символа",
                            },
                            maxLength: {
                                value: 16,
                                message: "Логин не должен превышать 16 символов",
                            },
                        }}
                    />
                    <label htmlFor="">{errors.username ? errors.username.message : "Логин"}</label>
                </div>
                <div className={styles.inputGroup}>
                    <Controller
                        name="password"
                        control={control}defaultValue=""
                        render={({ field }) => (
                            <input type="password" autoComplete="off" {...field} className={cn(styles.defaultInput, {
                                [styles.activeInput]: field.value,
                                [styles.errorInput]: errors.password,
                            })}/>
                        )}
                        rules={{
                            required: "Данное поле обязательно",
                            minLength: {
                                value: 3,
                                message: "Пароль должен содержать минимум 3 символа",
                            },
                            maxLength: {
                                value: 20,
                                message: "Пароль не должен превышать 20 символов",
                            },
                        }}
                    />
                    <label htmlFor="">{errors.password ? errors.password.message : "Пароль"}</label>
                </div>
                <button className={styles.registrationBtn}>{loading ? <CircularProgress size={20} color={"inherit"}/> : "Создать аккаунт"}</button>
                {
                    registrationError.isError &&
                    <div className={styles.registrationError}>
                        {registrationError.message}
                    </div>
                }
                <span className={styles.accountInfo}>Есть аккаунт? <Link href="/sign-in">Войти</Link></span>
            </form>
        </div>
    );
}

export default SignUpForm;